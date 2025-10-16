const axios = require('axios');

class ZammadService {
    constructor() {
        this.baseURL = process.env.ZAMMAD_URL || 'http://zammad-nginx:8080';
        this.apiToken = process.env.ZAMMAD_API_TOKEN;
        
        this.client = axios.create({
            baseURL: `${this.baseURL}/api/v1`,
            headers: {
                'Authorization': `Token token=${this.apiToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
    }

    // Check if Zammad is configured
    isConfigured() {
        return !!this.apiToken && this.apiToken !== 'your-zammad-api-token-here';
    }

    // Get all tickets
    async getTickets(page = 1, perPage = 50) {
        try {
            const response = await this.client.get('/tickets', {
                params: { page, per_page: perPage, expand: true }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching tickets:', error.message);
            throw error;
        }
    }

    // Get tickets by customer email
    async getTicketsByCustomer(customerEmail) {
        try {
            const response = await this.client.get('/tickets/search', {
                params: { 
                    query: `customer.email:${customerEmail}`,
                    expand: true 
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching customer tickets:', error.message);
            return [];
        }
    }

    // Get single ticket
    async getTicket(ticketId) {
        try {
            const response = await this.client.get(`/tickets/${ticketId}`, {
                params: { expand: true }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching ticket:', error.message);
            throw error;
        }
    }

    // Create ticket
    async createTicket(ticketData) {
        try {
            const response = await this.client.post('/tickets', {
                title: ticketData.title,
                group: ticketData.group || 'Users',
                customer: ticketData.customer_email,
                article: {
                    subject: ticketData.title,
                    body: ticketData.body,
                    type: 'note',
                    internal: false
                },
                priority: ticketData.priority || '2 normal',
                state: 'new'
            });
            return response.data;
        } catch (error) {
            console.error('Error creating ticket:', error.message);
            throw error;
        }
    }

    // Update ticket
    async updateTicket(ticketId, updates) {
        try {
            const response = await this.client.put(`/tickets/${ticketId}`, updates);
            return response.data;
        } catch (error) {
            console.error('Error updating ticket:', error.message);
            throw error;
        }
    }

    // Add article/comment to ticket
    async addArticle(ticketId, article) {
        try {
            const response = await this.client.post('/ticket_articles', {
                ticket_id: ticketId,
                subject: article.subject || 'Reply',
                body: article.body,
                type: 'note',
                internal: article.internal || false
            });
            return response.data;
        } catch (error) {
            console.error('Error adding article:', error.message);
            throw error;
        }
    }

    // Get ticket articles/comments
    async getTicketArticles(ticketId) {
        try {
            const response = await this.client.get(`/ticket_articles/by_ticket/${ticketId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching articles:', error.message);
            return [];
        }
    }

    // Get ticket statistics
    async getTicketStats() {
        try {
            // Get all tickets and calculate stats
            const tickets = await this.getTickets(1, 1000);
            
            const stats = {
                total: tickets.length || 0,
                open: 0,
                pending: 0,
                closed: 0
            };

            if (Array.isArray(tickets)) {
                tickets.forEach(ticket => {
                    const state = ticket.state?.name?.toLowerCase() || '';
                    if (state === 'new' || state === 'open') {
                        stats.open++;
                    } else if (state.includes('pending')) {
                        stats.pending++;
                    } else if (state === 'closed') {
                        stats.closed++;
                    }
                });
            }

            return stats;
        } catch (error) {
            console.error('Error fetching ticket stats:', error.message);
            return { total: 0, open: 0, pending: 0, closed: 0 };
        }
    }

    // Get or create user by email
    async getOrCreateUser(email, name) {
        try {
            // Try to find user first
            const searchResponse = await this.client.get('/users/search', {
                params: { query: email }
            });

            if (searchResponse.data && searchResponse.data.length > 0) {
                return searchResponse.data[0];
            }

            // Create user if not found
            const createResponse = await this.client.post('/users', {
                firstname: name.split(' ')[0] || name,
                lastname: name.split(' ').slice(1).join(' ') || '',
                email: email,
                roles: ['Customer']
            });

            return createResponse.data;
        } catch (error) {
            console.error('Error getting/creating user:', error.message);
            throw error;
        }
    }

    // Get groups
    async getGroups() {
        try {
            const response = await this.client.get('/groups');
            return response.data;
        } catch (error) {
            console.error('Error fetching groups:', error.message);
            return [];
        }
    }

    // Search tickets
    async searchTickets(query) {
        try {
            const response = await this.client.get('/tickets/search', {
                params: { query, expand: true }
            });
            return response.data;
        } catch (error) {
            console.error('Error searching tickets:', error.message);
            return [];
        }
    }
}

module.exports = new ZammadService();
