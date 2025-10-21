import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Interceptor to add JWT token to requests
API.interceptors.request.use((req) => {
    if (localStorage.getItem('profile')) {
        req.headers.Authorization = `Bearer ${JSON.parse(localStorage.getItem('profile')).token}`;
    }
    return req;
});

// Board API functions (already there)
export const fetchBoards = () => API.get('/boards');
export const createBoard = (newBoard) => API.post('/boards', newBoard);
export const getBoard = (id) => API.get(`/boards/${id}`);
export const updateBoard = (id, updatedBoard) => API.put(`/boards/${id}`, updatedBoard);
export const deleteBoard = (id) => API.delete(`/boards/${id}`);
export const addBoardMember = (id, memberEmail) => API.put(`/boards/${id}/members`, { email: memberEmail });

// --- NEW: List API functions ---
export const fetchLists = (boardId) => API.get(`/boards/${boardId}/lists`);
export const createList = (boardId, newList) => API.post(`/boards/${boardId}/lists`, newList);
export const updateList = (listId, updatedList) => API.put(`/lists/${listId}`, updatedList);
export const deleteList = (listId) => API.delete(`/lists/${listId}`);

// --- NEW: Card API functions ---
export const fetchCards = (listId) => API.get(`/lists/${listId}/cards`);
export const createCard = (listId, newCard) => API.post(`/lists/${listId}/cards`, newCard);
export const updateCard = (cardId, updatedCard) => API.put(`/cards/${cardId}`, updatedCard);
export const deleteCard = (cardId) => API.delete(`/cards/${cardId}`);

export default API;