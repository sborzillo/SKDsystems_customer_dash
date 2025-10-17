const axios = require('axios');

class ClockifyService {
    constructor() {
        this.apiKey = process.env.CLOCKIFY_API_KEY;
        this.baseURL = 'https://api.clockify.me/api/v1';
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'X-Api-Key': this.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    // Check if Clockify is configured
    isConfigured() {
        return !!this.apiKey && this.apiKey !== 'your-clockify-api-key-here';
    }

    // Get current user info and workspace
    async getCurrentUser() {
        try {
            const response = await this.client.get('/user');
            return response.data;
        } catch (error) {
            console.error('Error fetching Clockify user:', error.message);
            throw error;
        }
    }

    // Get all workspaces
    async getWorkspaces() {
        try {
            const response = await this.client.get('/workspaces');
            return response.data;
        } catch (error) {
            console.error('Error fetching workspaces:', error.message);
            throw error;
        }
    }

    // Get all clients in a workspace
    async getClients(workspaceId) {
        try {
            const response = await this.client.get(`/workspaces/${workspaceId}/clients`);
            return response.data;
        } catch (error) {
            console.error('Error fetching Clockify clients:', error.message);
            throw error;
        }
    }

    // Get all projects in a workspace
    async getProjects(workspaceId) {
        try {
            const response = await this.client.get(`/workspaces/${workspaceId}/projects`);
            return response.data;
        } catch (error) {
            console.error('Error fetching projects:', error.message);
            throw error;
        }
    }

    // Get all tags in a workspace
    async getTags(workspaceId) {
        try {
            const response = await this.client.get(`/workspaces/${workspaceId}/tags`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tags:', error.message);
            throw error;
        }
    }

    // Get time entries for a user in a workspace with pagination
    async getAllTimeEntries(workspaceId, userId, startDate, endDate) {
        try {
            let allEntries = [];
            let page = 1;
            const pageSize = 200;
            let hasMore = true;

            while (hasMore) {
                const params = {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    'page-size': pageSize,
                    page: page
                };

                const response = await this.client.get(
                    `/workspaces/${workspaceId}/user/${userId}/time-entries`,
                    { params }
                );

                const entries = response.data;
                
                if (entries && entries.length > 0) {
                    allEntries = allEntries.concat(entries);
                    page++;
                    
                    // If we got fewer entries than page size, we're done
                    if (entries.length < pageSize) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            }

            return allEntries;
        } catch (error) {
            console.error('Error fetching time entries:', error.message);
            throw error;
        }
    }

    // Calculate duration in hours from time interval
    calculateDuration(timeInterval) {
        if (!timeInterval || !timeInterval.start) return 0;
        
        const start = new Date(timeInterval.start);
        const end = timeInterval.end ? new Date(timeInterval.end) : new Date();
        const durationMs = end - start;
        const hours = durationMs / (1000 * 60 * 60);
        
        return hours;
    }

    // Get billable hours by client for a date range
    async getBillableHoursByClient(workspaceId, userId, startDate, endDate) {
        try {
            console.log('Fetching time entries from Clockify...');
            const allEntries = await this.getAllTimeEntries(workspaceId, userId, startDate, endDate);
            console.log(`Found ${allEntries.length} total time entries`);

            // Get all projects to map project IDs to client names
            const projects = await this.getProjects(workspaceId);
            const projectMap = {};
            projects.forEach(project => {
                projectMap[project.id] = {
                    name: project.name,
                    clientId: project.clientId,
                    clientName: project.clientName
                };
            });

            const hoursByClient = {};

            for (const entry of allEntries) {
                // Only count billable entries
                if (!entry.billable) continue;

                // Calculate duration
                const hours = this.calculateDuration(entry.timeInterval);
                
                // Get client info from project
                let clientName = 'No Client';
                let clientId = null;

                if (entry.projectId && projectMap[entry.projectId]) {
                    const project = projectMap[entry.projectId];
                    clientName = project.clientName || 'No Client';
                    clientId = project.clientId;
                }

                // Skip entries without a client
                if (clientName === 'No Client' || !clientName) continue;

                if (!hoursByClient[clientName]) {
                    hoursByClient[clientName] = {
                        clientId: clientId,
                        clientName: clientName,
                        hours: 0,
                        entries: 0
                    };
                }

                hoursByClient[clientName].hours += hours;
                hoursByClient[clientName].entries += 1;
            }

            console.log(`Calculated billable hours for ${Object.keys(hoursByClient).length} clients`);
            return hoursByClient;
        } catch (error) {
            console.error('Error calculating billable hours:', error.message);
            throw error;
        }
    }

    // Get summary data for dashboard
    async getSummaryData(workspaceId, userId, startDate, endDate) {
        try {
            const entries = await this.getAllTimeEntries(workspaceId, userId, startDate, endDate);
            
            let totalHours = 0;
            let billableHours = 0;
            const projectHours = {};
            
            for (const entry of entries) {
                const hours = this.calculateDuration(entry.timeInterval);
                
                totalHours += hours;
                
                if (entry.billable) {
                    billableHours += hours;
                }
                
                if (entry.projectId) {
                    if (!projectHours[entry.projectId]) {
                        projectHours[entry.projectId] = 0;
                    }
                    projectHours[entry.projectId] += hours;
                }
            }
            
            return {
                totalHours: Math.round(totalHours * 100) / 100,
                billableHours: Math.round(billableHours * 100) / 100,
                nonBillableHours: Math.round((totalHours - billableHours) * 100) / 100,
                entries: entries.length,
                projectHours
            };
        } catch (error) {
            console.error('Error getting summary data:', error.message);
            throw error;
        }
    }
}

module.exports = new ClockifyService();
