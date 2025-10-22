/**
 * Utility untuk membuat akun admin pertama
 * * Cara penggunaan:
 * 1. Buka browser console di aplikasi
 * 2. Jalankan: setupAdmin("admin@example.com", "password123", "Admin Name")
 * 3. Gunakan kredensial tersebut untuk login
 */

import { projectId, publicAnonKey } from './supabase/info';

export async function setupAdmin(email: string, password: string, name: string) {
  // Assuming 'make-server-c461e4cf' is the name of your Edge Function
  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;
  
  try {
    const response = await fetch(`${apiUrl}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 🔑 FIX: Add the Authorization header with the publicAnonKey as a Bearer Token
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email, password, name })
    });

    const data = await response.json();
    
    // Check for a non-2xx status code response, as the console log shows
    // it was logging "Admin created successfully!" even with a 401 error.
    if (!response.ok || data.error || data.code === 401) { 
      console.error('Error creating admin:', data.message || data.error || 'Unknown error');
      return { success: false, error: data.message || data.error || 'Unknown error' };
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