import { Button } from "@mui/material";
import { useState } from 'react';
import LoginStyles from '../../src/styles/login';
import '../../src/app/globals.css';
import InputLog from "@/components/inputLog";
import InputLogPass from "@/components/inputLogPass";
import InacarLogo from '../../public/logo-INACAR.png';
import Image from 'next/image';
import { useRouter } from 'next/router';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json(); // Handle errors
                console.error('Login error:', errorData.message);
                setError(errorData.message || 'Error desconocido.');
                return; // Exit early if there's an error
            }

            const data = await response.json();
            if (typeof window !== 'undefined') {
                localStorage.setItem('first_name', data.first_name);
                localStorage.setItem('last_name', data.last_name);
                localStorage.setItem('token', data.token);
            }

            if (data.userType === 'admin') {
                router.push('/uen/constructora');
            } else if (data.userType === 'user') {
                router.push('/');
            } else {
                setError('Tipo de usuario desconocido.');
            }
        } catch (error) {
            setError('¡Hubo un error! Por favor, inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
        }
    };

    return (
        <>
            <div className="background"></div>
            <div className="login-container">
                <Image src={InacarLogo} height={80} width={160} alt="Inacar Logo" priority />
                <InputLog
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown} 
                    children={'Username'}
                />
                <InputLogPass
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown} 
                    children={'Password'}
                />
                <Button
                    onClick={handleLogin}
                    variant="contained"
                    disabled={loading}
                    sx={LoginStyles.buttom}
                >
                    {loading ? 'Iniciando...' : 'Iniciar Sesion'}
                </Button>
                {error && <p className="error-message">{error}</p>}
            </div>
        </>
    );
};

export default Login;
