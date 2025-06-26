import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const companyUserService = {
  // Get all users in the company
  getUsers: () => api.get('/v2/users'),
  
  // Get company stats
  getCompanyStats: () => api.get('/v2/users/stats'),
  
  // Invite a new user
  inviteUser: (data: {
    email: string
    role: 'company_admin' | 'company_employee'
  }) => api.post('/v2/users/invite', data),
  
  // Get all invitations
  getInvitations: () => api.get('/v2/users/invitations'),
  
  // Update user role
  updateUserRole: (userId: number, role: 'company_admin' | 'company_employee') => 
    api.put(`/v2/users/${userId}/role`, { role }),
  
  // Remove user from company
  removeUser: (userId: number) => 
    api.delete(`/v2/users/${userId}`),
  
  // Revoke invitation
  revokeInvitation: (invitationId: string) => 
    api.delete(`/v2/users/invitations/${invitationId}`),
  
  // Resend invitation
  resendInvitation: (invitationId: string) => 
    api.post(`/v2/users/invitations/${invitationId}/resend`),
}