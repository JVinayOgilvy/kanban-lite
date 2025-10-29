import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../assets/css/components/BoardCard.module.css';

const BoardCard = ({ board }) => {
    console.log('Rendering BoardCard from Components for board:', board);
    return (
        <div className={styles.card}>
            <h3 className={styles.title}>{board.title}</h3>
            <p className={styles.owner}>Owner: {board.owner?.name || 'N/A'}</p>
            <p className={styles.members}>Members: {board.members?.length || 0}</p>
            <Link to={`/board/${board._id}`} className={styles.linkButton}>
                Go to Board
            </Link>
        </div>
    );
};

export default BoardCard;