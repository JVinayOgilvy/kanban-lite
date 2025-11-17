const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Board = require('./models/Board');
const User = require('./models/User');

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

const migrateBoardMembers = async () => {
    await connectDB();

    console.log('Starting board members migration...');

    try {
        // Fetch boards without populating, we'll check user existence manually
        const boards = await Board.find({});

        for (const board of boards) {
            let needsUpdate = false;
            const newMembers = [];
            const existingMemberIds = new Set(); // To track unique user IDs

            // 1. Process the owner
            if (board.owner) {
                const ownerUserExists = await User.findById(board.owner);
                if (ownerUserExists) {
                    // Ensure owner is added with 'owner' role
                    if (!existingMemberIds.has(board.owner.toString())) {
                        newMembers.push({ user: board.owner, role: 'owner' });
                        existingMemberIds.add(board.owner.toString());
                        needsUpdate = true;
                    }
                } else {
                    console.warn(`Board ${board._id}: Owner user ${board.owner} not found. This board might be orphaned.`);
                    // If owner doesn't exist, we might want to delete the board or assign a new owner.
                    // For now, we'll just log and proceed without an owner entry.
                    needsUpdate = true; // Mark for update as owner entry might be missing or invalid
                }
            } else {
                console.warn(`Board ${board._id}: Has no owner defined.`);
                needsUpdate = true;
            }

            // 2. Process existing members from the raw board.members array
            // This handles both old (ObjectId array) and new (object array) formats
            for (const memberEntry of board.members) {
                let currentUserId;
                let currentRole = 'member'; // Default role

                if (memberEntry.user && memberEntry.role) {
                    // Already in the new format { user: ObjectId, role: String }
                    currentUserId = memberEntry.user;
                    currentRole = memberEntry.role;
                } else if (mongoose.Types.ObjectId.isValid(memberEntry)) {
                    // Old format: memberEntry is just a userId (ObjectId)
                    currentUserId = memberEntry;
                    needsUpdate = true; // This board needs an update
                } else {
                    // Malformed entry (e.g., {user: null, role: 'member'})
                    console.warn(`Board ${board._id}: Found malformed member entry: ${JSON.stringify(memberEntry)}. Skipping.`);
                    needsUpdate = true;
                    continue; // Skip this malformed entry
                }

                // Verify the user actually exists in the User collection
                if (currentUserId) {
                    const memberUserExists = await User.findById(currentUserId);
                    if (memberUserExists) {
                        // Add to newMembers if not already added and not the owner (owner handled above)
                        if (!existingMemberIds.has(currentUserId.toString())) {
                            // If this member is the actual owner, ensure their role is 'owner'
                            if (board.owner && currentUserId.equals(board.owner)) {
                                currentRole = 'owner';
                            }
                            newMembers.push({ user: currentUserId, role: currentRole });
                            existingMemberIds.add(currentUserId.toString());
                        }
                    } else {
                        console.warn(`Board ${board._id}: Member user ${currentUserId} not found. Removing from members list.`);
                        needsUpdate = true; // User doesn't exist, so this entry needs to be removed
                    }
                }
            }

            // Sort newMembers for consistent comparison
            newMembers.sort((a, b) => a.user.toString().localeCompare(b.user.toString()));

            // Compare the new members array with the original (after mapping to a comparable format)
            const originalMembersMapped = board.members.map(m => ({
                user: (m.user && m.user._id) ? m.user._id.toString() : (m.user ? m.user.toString() : (mongoose.Types.ObjectId.isValid(m) ? m.toString() : null)),
                role: m.role || 'member'
            })).filter(m => m.user !== null).sort((a, b) => a.user.localeCompare(b.user));

            const newMembersMapped = newMembers.map(m => ({
                user: m.user.toString(),
                role: m.role
            })).sort((a, b) => a.user.localeCompare(b.user));

            if (needsUpdate || JSON.stringify(originalMembersMapped) !== JSON.stringify(newMembersMapped)) {
                board.members = newMembers;
                await board.save();
                console.log(`Updated board: ${board.title} (${board._id}) - Members: ${newMembers.length}`);
            } else {
                console.log(`Board: ${board.title} (${board._id}) - No update needed.`);
            }
        }

        console.log('Board members migration completed successfully!');
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
};

migrateBoardMembers();