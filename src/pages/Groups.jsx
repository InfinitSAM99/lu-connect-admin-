import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext.jsx';
import { TrashIcon, BanIcon } from '../components/Icons.jsx';

export default function Groups() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    const { data, error } = await supabase
      .from('groups')
      .select('*, creator:profiles!groups_created_by_fkey(id, full_name, email)')
      .order('created_at', { ascending: false });
    if (error) {
      setErr(error.message + ' — ' + (error.details || ''));
      setGroups([]);
    } else {
      setGroups(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleArchive = async (g) => {
    await supabase
      .from('groups')
      .update({ is_archived: !g.is_archived })
      .eq('id', g.id);
    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id,
      action: g.is_archived ? 'unarchive_group' : 'archive_group',
      target_type: 'group',
      target_id: g.id,
    });
    load();
  };

  const remove = async (g) => {
    if (!confirm(`Delete group "${g.name}"?`)) return;
    await supabase.from('groups').delete().eq('id', g.id);
    await supabase.from('admin_audit_logs').insert({
      admin_id: profile.id,
      action: 'delete_group',
      target_type: 'group',
      target_id: g.id,
      details: { name: g.name },
    });
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Groups</h1>
        <p className="page-subtitle">All student-created groups and communities</p>
      </div>

      {err && (
        <div
          style={{
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <strong>Query error:</strong> {err}
        </div>
      )}

      {loading && <div className="state">Loading…</div>}

      {!loading && !err && groups.length === 0 && (
        <div className="flat-empty">No groups yet</div>
      )}

      {!loading && groups.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Name</th>
                <th style={{ width: 100 }}>Category</th>
                <th style={{ width: 80 }}>Members</th>
                <th style={{ minWidth: 160 }}>Creator</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div className="cell-user">
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: g.cover_url
                            ? `url(${g.cover_url}) center/cover`
                            : 'linear-gradient(135deg, var(--brand) 0%, #7f1d1d 100%)',
                          flexShrink: 0,
                        }}
                      />
                      <div className="cell-user-info">
                        <div className="cell-user-name">{g.name}</div>
                        {g.description && (
                          <div className="cell-user-sub" style={{ maxWidth: 260 }}>
                            {g.description.slice(0, 60)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, textTransform: 'capitalize' }}>{g.category || '—'}</td>
                  <td style={{ fontSize: 13 }}>{g.member_count ?? 0}</td>
                  <td>
                    {g.creator ? (
                      <Link to={`/students/${g.creator.id}`} className="cell-user">
                        <div className="cell-user-info">
                          <div className="cell-user-name" style={{ fontSize: 13 }}>
                            {g.creator.full_name}
                          </div>
                          <div className="cell-user-sub">{g.creator.email}</div>
                        </div>
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-3)' }}>—</span>
                    )}
                  </td>
                  <td>
                    {g.is_archived
                      ? <span className="badge badge-red">Archived</span>
                      : <span className="badge badge-green">Active</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="cell-actions">
                      <button
                        className={'icon-btn' + (g.is_archived ? '' : ' icon-btn-warn')}
                        title={g.is_archived ? 'Unarchive' : 'Archive'}
                        onClick={() => toggleArchive(g)}
                      >
                        <BanIcon width={16} height={16} />
                      </button>
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Delete"
                        onClick={() => remove(g)}
                      >
                        <TrashIcon width={16} height={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
