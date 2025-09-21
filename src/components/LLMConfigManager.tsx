'use client';

import React, { useState, useEffect } from 'react';
import { llmConfigManager, PREDEFINED_CONFIGS } from '@/lib/llm/config';
import { LLMConfig } from '@/lib/llm/adapters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ConfigurationInfo {
    id: string;
    name: string;
    provider: string;
    model: string;
}

interface LLMConfigManagerProps {
    onConfigurationChange?: (configId: string) => void;
    showInModal?: boolean;
}

export function LLMConfigManager({ onConfigurationChange }: LLMConfigManagerProps) {
    const [configurations, setConfigurations] = useState<ConfigurationInfo[]>([]);
    const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [customConfig, setCustomConfig] = useState<Record<string, string>>({});
    const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean | null>>({});
    const [testing, setTesting] = useState<Record<string, boolean>>({});
    const [, setLoading] = useState(true);

    const getProviderDisplayName = (config: LLMConfig): string => {
        switch (config.provider) {
            case 'openai':
                return 'OpenAI';
            case 'anthropic':
                return 'Anthropic';
            case 'lmstudio':
                return 'LM Studio';
            case 'ollama':
                return 'Ollama';
            default:
                return 'Unknown';
        }
    };

    const getModelDisplayName = (config: LLMConfig): string => {
        if ('model' in config && config.model) return config.model;
        return 'Default';
    };

    useEffect(() => {
        loadConfigurations();
    }, []);

    const loadConfigurations = async () => {
        try {
            setLoading(true);
            const configs = await llmConfigManager.getAllConfigurations();
            setConfigurations(configs);

            const activeConfig = await llmConfigManager.getActiveConfiguration();
            setActiveConfigId(activeConfig?.id || null);
        } catch (error) {
            console.error('Failed to load configurations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSetActive = async (configId: string) => {
        try {
            await llmConfigManager.setActiveConfiguration(configId);
            setActiveConfigId(configId);
            onConfigurationChange?.(configId);
        } catch (error) {
            console.error('Failed to set active configuration:', error);
        }
    };

    const handleAddConfiguration = async () => {
        if (!selectedTemplate) return;

        try {
            const template = PREDEFINED_CONFIGS[selectedTemplate];
            if (!template) return;

            // Create config from template with customizations
            const config = llmConfigManager.createFromTemplate(selectedTemplate, customConfig);

            // Generate unique ID
            const id = `${selectedTemplate}-${Date.now()}`;
            await llmConfigManager.addConfiguration(id, config);

            // Reset form
            setSelectedTemplate('');
            setCustomConfig({});
            setShowAddForm(false);

            await loadConfigurations();
        } catch (error) {
            console.error('Failed to add configuration:', error);
            alert('Failed to add configuration. Please check your inputs.');
        }
    };

    const handleTestConnection = async (configId: string) => {
        setTesting((prev) => ({ ...prev, [configId]: true }));

        try {
            const result = await llmConfigManager.testConfiguration(configId);
            setConnectionStatus((prev) => ({
                ...prev,
                [configId]: result.success
            }));

            if (!result.success && result.error) {
                console.error(`Connection test failed for ${configId}:`, result.error);
            }
        } catch (error) {
            setConnectionStatus((prev) => ({ ...prev, [configId]: false }));
            console.error('Connection test error:', error);
        } finally {
            setTesting((prev) => ({ ...prev, [configId]: false }));
        }
    };

    const handleRemoveConfiguration = (configId: string) => {
        if (confirm('Are you sure you want to remove this configuration?')) {
            llmConfigManager.removeConfiguration(configId);
            loadConfigurations();
        }
    };

    const getTemplateFields = (
        templateId: string
    ): Array<{
        key: string;
        label: string;
        type: string;
        required: boolean;
    }> => {
        const template = PREDEFINED_CONFIGS[templateId];
        if (!template) return [];

        const fields: Array<{
            key: string;
            label: string;
            type: string;
            required: boolean;
        }> = [];

        if (template.provider === 'openai' || template.provider === 'anthropic') {
            fields.push({
                key: 'api_key',
                label: 'API Key',
                type: 'password',
                required: true
            });
        }

        if (template.provider === 'lmstudio' || template.provider === 'ollama') {
            fields.push({
                key: 'base_url',
                label: 'Base URL',
                type: 'url',
                required: true
            });
        }

        if (template.provider === 'ollama') {
            fields.push({
                key: 'model',
                label: 'Model Name',
                type: 'text',
                required: true
            });
        }

        return fields;
    };

    const renderConfigurationCard = (config: ConfigurationInfo) => {
        const isActive = config.id === activeConfigId;
        const isConnected = connectionStatus[config.id];
        const isTesting = testing[config.id];

        return (
            <Card key={config.id} className={`${isActive ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{config.name}</CardTitle>
                        <div className="flex items-center gap-2">
                            {isConnected === true && (
                                <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
                            )}
                            {isConnected === false && (
                                <div className="w-2 h-2 bg-red-500 rounded-full" title="Connection failed" />
                            )}
                            {isActive && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                    Active
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {config.provider} • {config.model}
                    </p>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex gap-2">
                        {!isActive && (
                            <Button size="sm" variant="outline" onClick={() => handleSetActive(config.id)}>
                                Use This
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestConnection(config.id)}
                            disabled={isTesting}
                        >
                            {isTesting ? 'Testing...' : 'Test'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveConfiguration(config.id)}>
                            Remove
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">LLM Configuration Manager</h2>
                <Button onClick={() => setShowAddForm(true)}>Add Configuration</Button>
            </div>

            {showAddForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Add New Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Template</label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => {
                                    setSelectedTemplate(e.target.value);
                                    setCustomConfig({});
                                }}
                                className="w-full p-2 border rounded"
                            >
                                <option value="">Select a template...</option>
                                {Object.entries(PREDEFINED_CONFIGS).map(([id, config]) => (
                                    <option key={id} value={id}>
                                        {getProviderDisplayName(config)} - {getModelDisplayName(config)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedTemplate &&
                            getTemplateFields(selectedTemplate).map((field) => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium mb-2">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <Input
                                        type={field.type}
                                        value={customConfig[field.key] || ''}
                                        onChange={(e) =>
                                            setCustomConfig((prev) => ({
                                                ...prev,
                                                [field.key]: e.target.value
                                            }))
                                        }
                                        placeholder={
                                            field.key === 'api_key'
                                                ? 'Enter your API key'
                                                : field.key === 'base_url'
                                                  ? 'http://localhost:1234'
                                                  : field.key === 'model'
                                                    ? 'llama2'
                                                    : ''
                                        }
                                    />
                                </div>
                            ))}

                        <div className="flex gap-2">
                            <Button onClick={handleAddConfiguration} disabled={!selectedTemplate}>
                                Add Configuration
                            </Button>
                            <Button variant="outline" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {configurations.map(renderConfigurationCard)}
            </div>

            {configurations.length === 0 && (
                <Card>
                    <CardContent className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No LLM configurations found</p>
                        <Button onClick={() => setShowAddForm(true)}>Add Your First Configuration</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
