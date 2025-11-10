import React, { useEffect, useState } from 'react';
import { getDeletionAudit, type DeletionAudit } from '../utils/apiClient';
import { ImageIcon } from './icons/ImageIcon';
import { BananaGuideIcon } from './icons/BananaGuideIcon';
import { BoxIcon } from './icons/BoxIcon';
import { TrashIcon } from './icons/TrashIcon';

export function DeletionHistory() {
  const [audits, setAudits] = useState<DeletionAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'banana' | 'batch'>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadAudits();
  }, [filter, page]);

  const loadAudits = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getDeletionAudit(
        limit,
        page * limit,
        filter === 'all' ? undefined : filter
      );
      setAudits(result.audits);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load deletion history');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'banana':
        return <BananaGuideIcon className="w-5 h-5" />;
      case 'batch':
        return <BoxIcon className="w-5 h-5" />;
      default:
        return <TrashIcon className="w-5 h-5" />;
    }
  };

  const getStatusColor = (audit: DeletionAudit) => {
    if (!audit.success) return 'text-red-500';
    if (audit.partialSuccess) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusText = (audit: DeletionAudit) => {
    if (!audit.success) return 'Failed';
    if (audit.partialSuccess) return 'Partial';
    return 'Success';
  };

  const getTargetDescription = (audit: DeletionAudit) => {
    switch (audit.operationType) {
      case 'image':
        return audit.target.objectPath || 'Unknown';
      case 'banana':
        return `${audit.target.batchId}/${audit.target.bananaId}`;
      case 'batch':
        return audit.target.batchId || 'Unknown';
      default:
        return 'Unknown';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="bg-[#1a1f2e] rounded-lg border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Deletion History</h3>
            <p className="text-sm text-slate-400 mt-1">
              Audit trail of all deletion operations
            </p>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilter('all');
                setPage(0);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setFilter('image');
                setPage(0);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'image'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => {
                setFilter('banana');
                setPage(0);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'banana'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              Bananas
            </button>
            <button
              onClick={() => {
                setFilter('batch');
                setPage(0);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'batch'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              Batches
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-slate-400">Loading deletion history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <button
              onClick={loadAudits}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : audits.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No deletion history found</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-slate-700/50">
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Target</th>
                    <th className="pb-3 font-medium">Deleted</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">User</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {audits.map((audit) => (
                    <tr
                      key={audit._id}
                      className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 text-slate-300">
                        {formatTimestamp(audit.timestamp)}
                      </td>
                      <td className="py-3">
                        <span className="flex items-center gap-2 text-slate-300">
                          {getOperationIcon(audit.operationType)}
                          <span className="capitalize">
                            {audit.operationType}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-xs max-w-xs truncate">
                        {getTargetDescription(audit)}
                      </td>
                      <td className="py-3 text-slate-300">
                        <div className="flex flex-col">
                          <span>{audit.deletedCount} records</span>
                          <span className="text-xs text-slate-500">
                            {audit.gcsDeletedCount} files
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`font-medium ${getStatusColor(audit)}`}>
                          {getStatusText(audit)}
                        </span>
                        {audit.errors.length > 0 && (
                          <span
                            className="ml-2 text-xs text-slate-500 cursor-help"
                            title={audit.errors.join('\n')}
                          >
                            ({audit.errors.length} errors)
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400 text-xs">{audit.userId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total}{' '}
                  deletions
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 rounded-lg bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-slate-400">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-4 py-2 rounded-lg bg-slate-700/30 text-slate-300 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
