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

    // Get time entries for a user in a workspace
    async getTimeEntries(workspaceId, userId, startDate, endDate, options = {}) {
        try {
            const params = {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                'page-size': 1000,
                ...options
            };

            const response = await this.client.get(
                `/workspaces/${workspaceId}/user/${userId}/time-entries`,
                { params }
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching time entries:', error.message);
            throw error;
        }
    }

    // Get detailed time report
    async getDetailedReport(workspaceId, startDate, endDate, options = {}) {
        try {
            const body = {
                dateRangeStart: startDate.toISOString(),
                dateRangeEnd: endDate.toISOString(),
                detailedFilter: {
                    page: 1,
                    pageSize: 1000,
                    ...options
                }
            };

            const response = await this.client.post(
                `/workspaces/${workspaceId}/reports/detailed`,
                body
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching detailed report:', error.message);
            throw error;
        }
    }

    // Calculate hours from duration (duration is in ISO 8601 format like "PT1H30M")
    durationToHours(duration) {
        if (!duration) return 0;
        
        // Parse ISO 8601 duration or seconds
        if (typeof duration === 'string') {
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (match) {
                const hours = parseInt(match[1] || 0);
                const minutes = parseInt(match[2] || 0);
                const seconds = parseInt(match[3] || 0);
                return hours + (minutes / 60) + (seconds / 3600);
            }
        }
        
        // If duration is in seconds
        if (typeof duration === 'number') {
            return duration / 3600;
        }
        
        return 0;
    }

    // Get billable hours by client for a date range
    async getBillableHoursByClient(workspaceId, startDate, endDate, billableTagIds = []) {
        try {
            const report = await this.getDetailedReport(workspaceId, startDate, endDate, {
                billable: 'BILLABLE'  // Only get billable entries
            });

            const hoursByClient = {};

            if (report.timeentries && Array.isArray(report.timeentries)) {
                for (const entry of report.timeentries) {
                    // Check if entry has billable tag if tags are specified
                    if (billableTagIds.length > 0) {
                        const entryTagIds = (entry.tags || []).map(t => t.id);
                        const hasBillableTag = billableTagIds.some(tagId => entryTagIds.includes(tagId));
                        if (!hasBillableTag) continue;
                    }

                    const clientName = entry.clientName || entry.clientId || 'No Client';
                    const clientId = entry.clientId;
                    const duration = entry.timeInterval?.duration || 0;
                    const hours = duration / 3600; // Convert seconds to hours

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
            }

            return hoursByClient;
        } catch (error) {
            console.error('Error calculating billable hours:', error.message);
            throw error;
        }
    }

    // Get summary data for dashboard
    async getSummaryData(workspaceId, userId, startDate, endDate) {
        try {
            const entries = await this.getTimeEntries(workspaceId, userId, startDate, endDate);
            
            let totalHours = 0;
            let billableHours = 0;
            const projectHours = {};
            
            for (const entry of entries) {
                if (entry.timeInterval && entry.timeInterval.duration) {
                    const duration = entry.timeInterval.duration;
                    const hours = this.durationToHours(duration);
                    
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
