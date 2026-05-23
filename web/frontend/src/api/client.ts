import axios, { AxiosInstance } from 'axios';
import { Neuron, Synapse, SystemMetrics, ExecutionStatus } from '../types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Neuron API
  async getNeurons(): Promise<Neuron[]> {
    const response = await this.client.get<Neuron[]>('/neurons');
    return response.data;
  }

  async getNeuron(id: string): Promise<Neuron> {
    const response = await this.client.get<Neuron>(`/neurons/${id}`);
    return response.data;
  }

  async getNeuronScript(id: string): Promise<string> {
    const response = await this.client.get<{ script: string }>(`/neurons/${id}/script`);
    return response.data.script;
  }

  async createNeuron(neuron: { name: string; type: string; description: string; script?: string }): Promise<Neuron> {
    const response = await this.client.post<Neuron>('/neurons', neuron);
    return response.data;
  }

  async generateNeuron(request: {
    prompt: string;
    type: string;
    provider: string;
    apiKey?: string;
    ollamaUrl?: string;
  }): Promise<Neuron> {
    const response = await this.client.post<Neuron>('/neurons/generate', request);
    return response.data;
  }

  async executeNeuron(id: string, params?: Record<string, any>): Promise<ExecutionStatus> {
    const response = await this.client.post<ExecutionStatus>(`/neurons/${id}/execute`, params);
    return response.data;
  }

  async stopNeuronExecution(neuronId: string, executionId: string): Promise<void> {
    await this.client.post(`/neurons/${neuronId}/executions/${executionId}/stop`);
  }

  async getExecutionStatus(neuronId: string, executionId: string): Promise<ExecutionStatus> {
    const response = await this.client.get<ExecutionStatus>(
      `/neurons/${neuronId}/executions/${executionId}`
    );
    return response.data;
  }

  // Synapse API
  async getSynapses(): Promise<Synapse[]> {
    const response = await this.client.get<Synapse[]>('/synapses');
    return response.data;
  }

  async getSynapse(id: string): Promise<Synapse> {
    const response = await this.client.get<Synapse>(`/synapses/${id}`);
    return response.data;
  }

  async createSynapse(synapse: Partial<Synapse>): Promise<Synapse> {
    const response = await this.client.post<Synapse>('/synapses', synapse);
    return response.data;
  }

  async updateSynapse(id: string, synapse: Partial<Synapse>): Promise<Synapse> {
    const response = await this.client.put<Synapse>(`/synapses/${id}`, synapse);
    return response.data;
  }

  async deleteSynapse(id: string): Promise<void> {
    await this.client.delete(`/synapses/${id}`);
  }

  async executeSynapse(id: string): Promise<{ id: string; status: string; message: string }> {
    const response = await this.client.post(`/synapses/${id}/execute`);
    return response.data;
  }

  // System API
  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await this.client.get<SystemMetrics>('/metrics');
    return response.data;
  }

  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
