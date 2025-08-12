import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, TestTube, Check, X, Database, Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { insertSnowflakeConnectionSchema, type SnowflakeConnection } from '@shared/schema';

// Form schema for Snowflake connection
const snowflakeConnectionFormSchema = insertSnowflakeConnectionSchema.extend({
  password: z.string().min(1, 'Password or PAT token is required'),
});

type SnowflakeConnectionForm = z.infer<typeof snowflakeConnectionFormSchema>;

interface SnowflakeSettingsProps {
  userId: string;
}

export function SnowflakeSettings({ userId }: SnowflakeSettingsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SnowflakeConnectionForm>({
    resolver: zodResolver(snowflakeConnectionFormSchema),
    defaultValues: {
      userId,
      name: '',
      account: '',
      username: '',
      password: '',
      database: '',
      schema: '',
      warehouse: '',
      role: '',
      authenticator: 'SNOWFLAKE',
      isDefault: false,
      isActive: true,
    },
  });

  // Fetch Snowflake connections
  const { data: connections = [], isLoading } = useQuery({
    queryKey: [`/api/snowflake/connections/${userId}`],
    queryFn: async () => {
      const response = await fetch(`/api/snowflake/connections/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json() as Promise<SnowflakeConnection[]>;
    },
  });

  // Create connection mutation
  const createConnectionMutation = useMutation({
    mutationFn: async (data: SnowflakeConnectionForm) => {
      const response = await fetch('/api/snowflake/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/snowflake/connections/${userId}`] });
      setShowAddForm(false);
      form.reset();
      toast({
        title: 'Connection Created',
        description: 'Snowflake connection has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create Snowflake connection: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(`/api/snowflake/connections/${connectionId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to test connection');
      return response.json();
    },
    onSuccess: (data, connectionId) => {
      setTestingConnection(null);
      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: 'Successfully connected to Snowflake.',
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: 'Failed to connect to Snowflake. Please check your credentials.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      setTestingConnection(null);
      toast({
        title: 'Connection Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(`/api/snowflake/connections/${connectionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/snowflake/connections/${userId}`] });
      toast({
        title: 'Connection Deleted',
        description: 'Snowflake connection has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete connection: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  // Set default connection mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(`/api/snowflake/connections/${connectionId}/default`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('Failed to set default connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/snowflake/connections/${userId}`] });
      toast({
        title: 'Default Connection Updated',
        description: 'Default Snowflake connection has been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to set default connection: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: SnowflakeConnectionForm) => {
    createConnectionMutation.mutate(data);
  };

  const handleTestConnection = (connectionId: string) => {
    setTestingConnection(connectionId);
    testConnectionMutation.mutate(connectionId);
  };

  const handleDeleteConnection = (connectionId: string) => {
    if (confirm('Are you sure you want to delete this connection?')) {
      deleteConnectionMutation.mutate(connectionId);
    }
  };

  const handleSetDefault = (connectionId: string) => {
    setDefaultMutation.mutate(connectionId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading Snowflake connections...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Snowflake Connections</h2>
          <p className="text-muted-foreground">
            Manage your Snowflake database connections for data analysis and querying.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Connection
        </Button>
      </div>

      {/* Existing Connections */}
      <div className="grid gap-4">
        {connections.map((connection) => (
          <Card key={connection.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-sm font-medium">{connection.name}</CardTitle>
                    <CardDescription>
                      {connection.account} • {connection.username}
                      {connection.database && ` • ${connection.database}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connection.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    connection.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {connection.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Warehouse</Label>
                  <p>{connection.warehouse || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Schema</Label>
                  <p>{connection.schema || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Role</Label>
                  <p>{connection.role || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Authentication</Label>
                  <p className="flex items-center gap-2">
                    {connection.authenticator === 'PAT' ? (
                      <>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          PAT
                        </span>
                        Personal Access Token
                      </>
                    ) : connection.authenticator === 'USERNAME_PASSWORD_MFA' ? (
                      <>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          MFA
                        </span>
                        Multi-Factor Auth
                      </>
                    ) : (
                      <>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          PWD
                        </span>
                        Username/Password
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Connected</Label>
                  <p>
                    {connection.lastConnected 
                      ? new Date(connection.lastConnected).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection(connection.id)}
                  disabled={testingConnection === connection.id}
                >
                  {testingConnection === connection.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  Test Connection
                </Button>
                {!connection.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(connection.id)}
                  >
                    Set as Default
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteConnection(connection.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}

        {connections.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Snowflake Connections</h3>
              <p className="text-muted-foreground mb-4">
                Add your first Snowflake connection to start analyzing your data.
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Connection
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Connection Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Snowflake Connection</CardTitle>
            <CardDescription>
              Configure a new connection to your Snowflake data warehouse.
            </CardDescription>
          </CardHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Connection Name *</Label>
                  <Input
                    id="name"
                    placeholder="Production Warehouse"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="account">Account Identifier *</Label>
                  <Input
                    id="account"
                    placeholder="xy12345.us-east-1"
                    {...form.register('account')}
                  />
                  {form.formState.errors.account && (
                    <p className="text-sm text-red-600">{form.formState.errors.account.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="authenticator">Authentication Method *</Label>
                <Select 
                  value={form.watch('authenticator') || 'SNOWFLAKE'} 
                  onValueChange={(value) => form.setValue('authenticator', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SNOWFLAKE">Username/Password</SelectItem>
                    <SelectItem value="USERNAME_PASSWORD_MFA">Multi-Factor Authentication</SelectItem>
                    <SelectItem value="PAT">Personal Access Token (PAT)</SelectItem>
                    <SelectItem value="EXTERNALBROWSER">SSO/Browser</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="your_username"
                    {...form.register('username')}
                  />
                  {form.formState.errors.username && (
                    <p className="text-sm text-red-600">{form.formState.errors.username.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">
                    {form.watch('authenticator') === 'PAT' 
                      ? 'Personal Access Token *' 
                      : 'Password *'
                    }
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={
                      form.watch('authenticator') === 'PAT' 
                        ? 'pat_XXXXXXXXXXXXXXXX...' 
                        : 'your_password'
                    }
                    {...form.register('password')}
                  />
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
                  )}
                  {form.watch('authenticator') === 'PAT' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      PAT tokens bypass MFA and provide secure authentication for automated connections.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="database">Database</Label>
                  <Input
                    id="database"
                    placeholder="DATABASE_NAME"
                    {...form.register('database')}
                  />
                </div>
                <div>
                  <Label htmlFor="schema">Schema</Label>
                  <Input
                    id="schema"
                    placeholder="PUBLIC"
                    {...form.register('schema')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="warehouse">Warehouse</Label>
                  <Input
                    id="warehouse"
                    placeholder="COMPUTE_WH"
                    {...form.register('warehouse')}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    placeholder="ACCOUNTADMIN"
                    {...form.register('role')}
                  />
                </div>
              </div>



              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={form.watch('isDefault') || false}
                  onCheckedChange={(checked) => form.setValue('isDefault', checked)}
                />
                <Label htmlFor="isDefault">Set as default connection</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createConnectionMutation.isPending}
              >
                {createConnectionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Connection
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}