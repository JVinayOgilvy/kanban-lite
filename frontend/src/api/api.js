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

// --- Start Board API functions ---
export const fetchBoards = () => API.get('/boards');
export const createBoard = (newBoard) => API.post('/boards', newBoard);
export const getBoard = (id) => API.get(`/boards/${id}`);
export const updateBoard = (id, updatedBoard) => API.put(`/boards/${id}`, updatedBoard);
export const deleteBoard = (id) => API.delete(`/boards/${id}`);
export const addBoardMember = (id, memberEmail) => API.put(`/boards/${id}/members`, { email: memberEmail });
// --- END Board API functions ---

export default API;