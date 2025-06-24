import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const generateAccessTokenFromRefreshToken = async ()=>
    axios.post(`${API_URL}/api/v1/auth/refresh`,{},{
        withCredentials: true,
    })


export const getProfile = async () =>
     axios.get(`${API_URL}/api/v1/auth/me`, {
         withCredentials: true,
     });
