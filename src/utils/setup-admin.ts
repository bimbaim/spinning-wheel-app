/**
 * Utility untuk membuat akun admin pertama
 * * Cara penggunaan:
 * 1. Buka browser console di aplikasi
 * 2. Jalankan: setupAdmin("admin@example.com", "password123", "Admin Name")
 * 3. Gunakan kredensial tersebut untuk login
 */

import { projectId, publicAnonKey } from './supabase/info'; 

export async function setupAdmin(email: string, password: string, name: string) {
  // 1. Construct the authorization token using the publicAnonKey
  const SUPABASE_AUTH_HEADER = `Bearer ${publicAnonKey}`; 
  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-c461e4cf`;
  
  try {
    const response = await fetch(`${apiUrl}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 2. FIX: Add the Authorization header
        'Authorization': SUPABASE_AUTH_HEADER, 
      },
      body: JSON.stringify({ email, password, name })
    });

    const data = await response.json();
    
    // 3. IMPROVEMENT: Check for a non-OK HTTP status *and* an error in the body
    if (!response.ok || data.error) {
      const errorMessage = data.error || `HTTP error: ${response.status} ${response.statusText}`;
      console.error('Error creating admin:', errorMessage);
      return { success: false, error: errorMessage };
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