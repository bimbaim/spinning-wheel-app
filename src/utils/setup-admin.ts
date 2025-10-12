/**
 * Utility untuk membuat akun admin pertama
 * 
 * Cara penggunaan:
 * 1. Buka browser console di aplikasi
 * 2. Jalankan: setupAdmin("admin@example.com", "password123", "Admin Name")
 * 3. Gunakan kredensial tersebut untuk login
 */

import { projectId, publicAnonKey } from './supabase/info';

export async function setupAdmin(email: string, password: string, name: string) {
  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;
  
  try {
    const response = await fetch(`${apiUrl}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Error creating admin:', data.error);
      return { success: false, error: data.error };
    }

    console.log('Admin created successfully!', data);
    return { success: true, user: data.user };
  } catch (error) {
    console.error('Failed to create admin:', error);
    return { success: false, error: String(error) };
  }
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
  (window as any).setupAdmin = setupAdmin;
}
