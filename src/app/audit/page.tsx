'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { Badge, Card, Button, Modal, EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getAuditLogs } from '@/lib/audit';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Shield, Filter, RefreshCw, ChevronDown, Eye, AlertTriangle, Info, CheckCircle } from 'lucide-react';

const severityColor = { info: 'blue' as const, warning: 'yellow' as const, critical: 'red' as const };
const severityIcon = {
  info: <Info className="w-3.5 h-3.5" />,
  warning: <AlertTriangle className="w-3.5 h-3.5" />,
  critical: <AlertTriangle className="w-3.5 h-3.5" />,
};

const MODULES = ['', 'Auth', 'Journal', 'Accounts', 'Invoices', 'Payments', 'Contacts', 'Users', 'Settings'];
const ACTIONS = ['', 'login', 'logout', 'create', 'update', 'delete', 'post', 'void', 'export', 'settings_change', 'password_change', 'login_failed'];

export default function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewLog, setViewLog] = useState<AuditLog | null>(null);
  const [filter, setFilter] = useState({ module: '', action: '' });
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    if (refresh) setLoading(true);
    const { logs: data } = await getAuditLogs(user.companyId, {
      module: filter.module || undefined,
      action: filter.action || undefined,
    });
    setLogs(data);
    setLoading(false);
  }, [user, filter]);

  useEffect(() => { load(true); }, [load]);

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title="Audit Log"
          subtitle="Complete security and activity trail — every action is recorded"
          action={
            <div className="flex items-center gap-3">
              <select className="input-field text-sm py-2 w-36" value={filter.module}
                onChange={(e) => setFilter((f) => ({ ...f, module: e.target.value }))}>
                {MODULES.map((m) => <option key={m} value={m} style={{ background: '#161b27' }}>{m || 'All Modules'}</option>)}
              </select>
              <select className="input-field text-sm py-2 w-36" value={filter.action}
                onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}>
                {ACTIONS.map((a) => <option key={a} value={a} style={{ background: '#161b27' }}>{a || 'All Actions'}</option>)}
              </select>
              <Button variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => load(true)}>Refresh</Button>
            </div>
          }
        />

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Events', value: logs.length, color: 'text-[--text]' },
            { label: 'Login Events', value: logs.filter((l) => l.action === 'login').length, color: 'text-[--green]' },
            { label: 'Warnings', value: logs.filter((l) => l.severity === 'warning').length, color: 'text-[--yellow]' },
            { label: 'Critical', value: logs.filter((l) => l.severity === 'critical').length, color: 'text-[--red]' },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <p className="text-xs text-[--text-3] mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <Card padding={false}>
            {logs.length === 0 ? (
              <EmptyState icon={<Shield className="w-10 h-10" />} title="No audit logs found"
                description="Activity will be logged here as users interact with the system." />
            ) : (
              <div className="overflow-x-auto">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th><th>User</th><th>Module</th><th>Action</th>
                      <th>Description</th><th>IP Address</th><th>Severity</th><th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td className="font-mono text-xs text-[--text-3] whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                        <td>
                          <div>
                            <p className="text-xs font-medium">{log.userName}</p>
                            <p className="text-[10px] text-[--text-3]">{log.userEmail}</p>
                          </div>
                        </td>
                        <td><span className="text-xs text-[--text-2]">{log.module}</span></td>
                        <td>
                          <Badge variant={
                            log.action === 'login' || log.action === 'create' ? 'green' :
                            log.action === 'void' || log.action === 'delete' ? 'red' :
                            log.action === 'login_failed' ? 'red' :
                            log.action === 'post' ? 'blue' : 'default'
                          }>
                            {log.action.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="max-w-[240px]"><p className="text-xs truncate">{log.description}</p></td>
                        <td className="font-mono text-xs text-[--text-3]">{log.ipAddress ?? '—'}</td>
                        <td>
                          <Badge variant={severityColor[log.severity]}>
                            {severityIcon[log.severity]}
                            {log.severity}
                          </Badge>
                        </td>
                        <td>
                          {(log.changes?.length ?? 0) > 0 && (
                            <button onClick={() => setViewLog(log)}
                              className="p-1.5 rounded hover:bg-[--bg-3] text-[--text-3] hover:text-[--text]">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Change Details Modal */}
      <Modal open={!!viewLog} onClose={() => setViewLog(null)} title="Change Details" size="lg">
        {viewLog && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[--text-3] text-xs mb-0.5">Timestamp</p><p className="font-mono text-xs">{formatDateTime(viewLog.timestamp)}</p></div>
              <div><p className="text-[--text-3] text-xs mb-0.5">User</p><p>{viewLog.userName} ({viewLog.userEmail})</p></div>
              <div><p className="text-[--text-3] text-xs mb-0.5">Action</p><Badge variant="blue">{viewLog.action}</Badge></div>
              <div><p className="text-[--text-3] text-xs mb-0.5">Entity</p><p className="font-mono text-xs">{viewLog.entityType} / {viewLog.entityId}</p></div>
              <div className="col-span-2"><p className="text-[--text-3] text-xs mb-0.5">Description</p><p>{viewLog.description}</p></div>
            </div>

            {viewLog.changes && viewLog.changes.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[--text-2] uppercase tracking-wider mb-2">Field Changes</p>
                <div className="border border-[--border] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[--bg]">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-[--text-3]">Field</th>
                        <th className="text-left px-3 py-2 text-xs text-[--red]">Old Value</th>
                        <th className="text-left px-3 py-2 text-xs text-[--green]">New Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewLog.changes.map((change, i) => (
                        <tr key={i} className="border-t border-[--border]">
                          <td className="px-3 py-2 text-xs font-mono text-[--accent-2]">{change.field}</td>
                          <td className="px-3 py-2 text-xs text-[--red] font-mono max-w-[150px] truncate">
                            {change.oldValue === null || change.oldValue === undefined ? '—' : JSON.stringify(change.oldValue)}
                          </td>
                          <td className="px-3 py-2 text-xs text-[--green] font-mono max-w-[150px] truncate">
                            {change.newValue === null || change.newValue === undefined ? '—' : JSON.stringify(change.newValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {viewLog.userAgent && (
              <div>
                <p className="text-xs text-[--text-3] mb-1">User Agent</p>
                <p className="text-xs font-mono text-[--text-2] break-all">{viewLog.userAgent}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </AuthGuard>
  );
}
