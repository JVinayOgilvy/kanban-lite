const emitBoardUpdate = (req, boardId, eventName, payload) => {
    const io = req.app.get('socketio');
    if (io) {
        io.to(boardId.toString()).emit(eventName, payload);
        console.log(`Emitted event '${eventName}' to board ${boardId}:`, payload);
    } else {
        console.warn('Socket.IO instance not available in request context.');
    }
};

module.exports = { emitBoardUpdate };