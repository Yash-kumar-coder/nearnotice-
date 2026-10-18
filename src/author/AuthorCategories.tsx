import React, { useState, useEffect, useCallback } from 'react';
import {
  Tags,
  Plus,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { AuthorService } from './authorService';
import type { CategoryItem } from './types';
import { invalidateCategoryCache } from '../hooks/useActiveCategories';
import { ALL_CATEGORY_ICON_OPTIONS, getCategoryIcon } from '../utils/categoryIcons';

export default function AuthorCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('graduation-cap');
  const [color, setColor] = useState('blue');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AuthorService.getCategories();
      setCategories(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setIcon('graduation-cap');
    setColor('blue');
    setSortOrder(categories.length + 1);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setIcon(cat.icon);
    setColor(cat.color);
    setSortOrder(cat.sort_order);
    setIsActive(cat.is_active);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      // Auto-generate slug for new categories
      setSlug(
        val
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await AuthorService.manageCategory({
          action: 'update',
          id: editingCategory.id,
          name: name.trim(),
          slug: slug.trim(),
          icon,
          color,
          is_active: isActive,
          sort_order: sortOrder,
        });
        showToast('success', 'Category updated successfully.');
      } else {
        await AuthorService.manageCategory({
          action: 'create',
          name: name.trim(),
          slug: slug.trim(),
          icon,
          color,
          is_active: isActive,
          sort_order: sortOrder,
        });
        showToast('success', 'New category created successfully.');
      }
      setIsModalOpen(false);
      invalidateCategoryCache();
      fetchCategories();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: CategoryItem) => {
    try {
      await AuthorService.manageCategory({
        action: 'toggle_active',
        id: cat.id,
      });
      showToast('success', `Category "${cat.name}" is now ${cat.is_active ? 'hidden' : 'active'}.`);
      invalidateCategoryCache();
      fetchCategories();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"? Notices with this category will remain in the database.`)) {
      return;
    }
    try {
      await AuthorService.manageCategory({
        action: 'delete',
        id: cat.id,
      });
      showToast('success', `Category "${cat.name}" deleted.`);
      invalidateCategoryCache();
      fetchCategories();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const availableIcons = ALL_CATEGORY_ICON_OPTIONS;
  const availableColors = ['blue', 'emerald', 'purple', 'amber', 'indigo', 'red', 'cyan', 'rose'];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium border flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Category Taxonomy</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Create and manage categories that appear dynamically on the NearNotice public noticeboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchCategories}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Extra Category</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchCategories}
            className="px-2.5 py-1 bg-red-100 hover:bg-red-200 rounded font-medium text-xs text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Categories Grid / Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="text-xs text-gray-400">Loading categories from database...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No categories found. Click &quot;Create Extra Category&quot; to add one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3">Order</th>
                  <th scope="col" className="px-4 py-3">Category Name</th>
                  <th scope="col" className="px-4 py-3">Slug (Identifier)</th>
                  <th scope="col" className="px-4 py-3">Icon & Color</th>
                  <th scope="col" className="px-4 py-3 text-center">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-400 text-xs">
                      #{cat.sort_order}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                          {React.createElement(getCategoryIcon(cat.icon, cat.name), { size: 14 })}
                        </div>
                        <span className="font-bold text-gray-900 text-xs">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-gray-500">
                      {cat.slug}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-mono border">
                        {cat.icon} · {cat.color}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                          cat.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {cat.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{cat.is_active ? 'Active (Live)' : 'Hidden'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cat)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 rounded transition-colors"
                      >
                        <Edit2 className="w-3 h-3 inline mr-1" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Category */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 text-xs text-gray-700 space-y-4 font-sans animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Real Estate, Jobs, Health"
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Slug (URL / Database Identifier)</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. real-estate"
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Icon Identifier</label>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 shrink-0 flex items-center justify-center w-8 h-8">
                      {React.createElement(getCategoryIcon(icon, name), { size: 16 })}
                    </div>
                    <select
                      value={
                        availableIcons.find(
                          (o) =>
                            o.id === icon ||
                            o.key === icon ||
                            o.id.toLowerCase() === icon?.toLowerCase() ||
                            o.key.toLowerCase() === icon?.toLowerCase()
                        )?.id || icon
                      }
                      onChange={(e) => setIcon(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-500 font-mono"
                    >
                      {availableIcons.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                      {!availableIcons.some(
                        (o) =>
                          o.id === icon ||
                          o.key === icon ||
                          o.id.toLowerCase() === icon?.toLowerCase() ||
                          o.key.toLowerCase() === icon?.toLowerCase()
                      ) &&
                        icon && <option value={icon}>{icon}</option>}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">Color Palette</label>
                  <select
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-500 capitalize"
                  >
                    {availableColors.map((cl) => (
                      <option key={cl} value={cl}>
                        {cl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interactive Visual Icon Palette */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-gray-600 font-medium">
                  <span>Visual Icon Palette (Click to select):</span>
                  <span className="font-mono text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    {availableIcons.find((o) => o.id === icon || o.key === icon)?.label || icon}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-44 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {availableIcons.map((opt) => {
                    const isSelected =
                      icon === opt.id ||
                      icon === opt.key ||
                      icon?.toLowerCase() === opt.id.toLowerCase() ||
                      icon?.toLowerCase() === opt.key.toLowerCase();
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setIcon(opt.id)}
                        title={opt.label}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 text-blue-600 font-bold shadow-xs ring-1 ring-blue-500'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <IconComp size={18} />
                        <span className="text-[10px] truncate max-w-full mt-1 font-mono">
                          {opt.key}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-700 text-xs">Active on Public Board</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium shadow-xs"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
