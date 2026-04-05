import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import resourceService from '../services/resourceService'
import ResourceList from '../components/ResourceList'
import ResourceForm from '../components/ResourceForm'

export default function ResourcesPage() {
  const { user } = useAuth()
  const [resources, setResources]  = useState([])
  const [filtered,  setFiltered]   = useState([])
  const [loading,   setLoading]    = useState(true)
  const [search,    setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal]  = useState(false)
  const [editing,   setEditing]    = useState(null)

  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF'

  const load = () => {
    setLoading(true)
    resourceService.getAll()
      .then(r => { setResources(r.data); setFiltered(r.data) })
      .catch(() => toast.error('Failed to load resources'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    let list = resources
    if (search)     list = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    if (typeFilter) list = list.filter(r => r.type === typeFilter)
    setFiltered(list)
  }, [search, typeFilter, resources])

  const handleSubmit = async (data) => {
    try {
      if (editing) {
        await resourceService.update(editing.id, data)
        toast.success('Resource updated')
      } else {
        await resourceService.create(data)
        toast.success('Resource created')
      }
      setShowModal(false)
      setEditing(null)
      load()
    } catch (err) { toast.error(err.message) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return
    try {
      await resourceService.delete(id)
      toast.success('Resource deleted')
      load()
    } catch (err) { toast.error(err.message) }
  }

  const TYPES = ['LECTURE_HALL', 'LAB', 'MEETING_ROOM', 'SPORTS', 'STUDY_ROOM', 'AUDITORIUM', 'OTHER']

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Campus Resources</h1>
          <p>Manage all campus facilities and assets</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={16} /> Add Resource
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} />
          <input placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading
        ? <div className="loading-container"><div className="spinner" /></div>
        : <ResourceList
            resources={filtered}
            onEdit={r => { setEditing(r); setShowModal(true) }}
            onDelete={handleDelete}
            canManage={canManage}
          />
      }

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2>{editing ? 'Edit Resource' : 'Add Resource'}</h2>
            <ResourceForm
              initial={editing}
              onSubmit={handleSubmit}
              onCancel={() => { setShowModal(false); setEditing(null) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
