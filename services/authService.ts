import { User } from '../types';
import { saveUser, getUserByEmail } from './storageService';
import { v4 as uuidv4 } from 'uuid';

// Mock hashing
const hashPassword = (password: string) => `hashed_${password.split('').reverse().join('')}`;

interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
}

export const register = async (username: string, email: string, password: string, fullName: string): Promise<AuthResponse> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network
  
  const existing = getUserByEmail(email);
  if (existing) {
    return { success: false, message: 'Email already registered' };
  }

  const newUser: User = {
    id: Math.random().toString(36).substr(2, 9),
    username,
    email,
    fullName,
    passwordHash: hashPassword(password),
    joinedAt: new Date().toISOString(),
  };

  saveUser(newUser);
  return { success: true, user: newUser };
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network

  const user = getUserByEmail(email);
  if (!user) {
    return { success: false, message: 'Invalid email or password' };
  }

  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, message: 'Invalid email or password' };
  }

  return { success: true, user };
};