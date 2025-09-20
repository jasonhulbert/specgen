'use client';

import React, { useState, useEffect } from 'react';
import { llmConfigManager } from '@/lib/llm/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LLMSelectorProps {
    onConfigurationChange?: (configId: string) => void;
    showManageButton?: boolean;
}

export function LLMSelector({ onConfigurationChange, showManageButton = true }: LLMSelectorProps) {
    const [configurations, setConfigurations] = useState<Array<{ id: string; name: string; provider: string }>>([]);
    const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
    const [showManager, setShowManager] = useState(false);
    const [loading, setLoading] = useState(true);

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
            console.error('Failed to load LLM configurations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigurationChange = async (configId: string) => {
        try {
            await llmConfigManager.setActiveConfiguration(configId);
            setActiveConfigId(configId);
            onConfigurationChange?.(configId);
        } catch (error) {
            console.error('Failed to switch LLM configuration:', error);
        }
    };

    const activeConfig = configurations.find((c) => c.id === activeConfigId);

    if (showManager) {
        const { LLMConfigManager } = require('@/components/LLMConfigManager');
        return (
            <LLMConfigManager
                onConfigurationChange={async (configId: string) => {
                    await handleConfigurationChange(configId);
                    setShowManager(false);
                }}
            />
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm">Active LLM</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="text-sm text-muted-foreground">Loading LLM configurations...</div>
                ) : (
                    <>
                        <div>
                            {activeConfig ? (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-sm">{activeConfig.name}</div>
                                        <div className="text-xs text-muted-foreground">{activeConfig.provider}</div>
                                    </div>
                                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Active" />
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">No LLM configured</div>
                            )}
                        </div>

                        {configurations.length > 1 && (
                            <div>
                                <label className="block text-xs font-medium mb-2">Switch LLM:</label>
                                <select
                                    value={activeConfigId || ''}
                                    onChange={(e) => handleConfigurationChange(e.target.value)}
                                    className="w-full text-xs p-2 border rounded"
                                >
                                    {configurations.map((config) => (
                                        <option key={config.id} value={config.id}>
                                            {config.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {showManageButton && (
                            <Button size="sm" variant="outline" onClick={() => setShowManager(true)} className="w-full">
                                Manage LLMs
                            </Button>
                        )}

                        {configurations.length === 0 && (
                            <Button size="sm" onClick={() => setShowManager(true)} className="w-full">
                                Setup LLM
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
