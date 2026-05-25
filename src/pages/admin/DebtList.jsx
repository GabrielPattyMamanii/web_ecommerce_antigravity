
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Plus, Search, Filter, Eye, Edit, Trash2,
    ArrowUpDown, CircleDollarSign, Package,
    ArrowDownLeft, ArrowUpRight
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Toggle } from '../../components/ui/Toggle';
import { Input } from '../../components/ui/Input';
import { DebtDetailModal } from '../../components/admin/DebtDetailModal';

export function DebtList() {
    const navigate = useNavigate();
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewDebtId, setViewDebtId] = useState(null);

    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'paid'
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'money', 'item'
    const [directionFilter, setDirectionFilter] = useState('all'); // 'all', 'receivable', 'payable'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc', 'asc' (by date)

    useEffect(() => {
        fetchDebts();
    }, []);

    const fetchDebts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('debts')
                .select('*')
                .order('date', { ascending: false });

            if (error) throw error;
            setDebts(data || []);
        } catch (error) {
            console.error('Error fetching debts:', error);
            alert('Error al cargar deudas');
        } finally {
            setLoading(false);
        }
    };

    // Toggle Status Optimistically
    const handleStatusToggle = async (debt) => {
        const newStatus = debt.status === 'pending' ? 'paid' : 'pending';

        // Optimistic Update
        setDebts(prev => prev.map(d =>
            d.id === debt.id ? { ...d, status: newStatus } : d
        ));

        try {
            const { error } = await supabase
                .from('debts')
                .update({ status: newStatus })
                .eq('id', debt.id);

            if (error) throw error;

        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar estado. Reviertiendo...');
            // Revert
            setDebts(prev => prev.map(d =>
                d.id === debt.id ? { ...d, status: debt.status } : d
            ));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;

        try {
            // 1. Fetch evidence to delete files
            const { data: evidence } = await supabase
                .from('debt_evidence')
                .select('file_path')
                .eq('debt_id', id);

            if (evidence && evidence.length > 0) {
                const paths = evidence.map(e => e.file_path);
                await supabase.storage.from('debt-evidence').remove(paths);
            }

            // 2. Delete Debt
            const { error } = await supabase
                .from('debts')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setDebts(prev => prev.filter(d => d.id !== id));

        } catch (error) {
            console.error('Error deleting debt:', error);
            alert('Error al eliminar');
        }
    };

    // Derived State (Filtering & Sorting)
    const filteredDebts = useMemo(() => {
        return debts.filter(debt => {
            const matchesSearch = debt.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (debt.reason && debt.reason.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
            const matchesType = typeFilter === 'all' || debt.debt_type === typeFilter;
            const matchesDirection = directionFilter === 'all' || debt.direction === directionFilter;

            return matchesSearch && matchesStatus && matchesType && matchesDirection;
        }).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [debts, searchTerm, statusFilter, typeFilter, directionFilter, sortOrder]);

    // Summaries
    const summary = useMemo(() => {
        const pendingDebts = debts.filter(d => d.status === 'pending');

        // Receivable (Me deben)
        const receivablePending = pendingDebts.filter(d => d.direction === 'receivable');
        const receivableMoney = receivablePending
            .filter(d => d.debt_type === 'money')
            .reduce((sum, d) => sum + (Number(d.money_amount) || 0), 0);

        // Payable (Yo debo)
        const payablePending = pendingDebts.filter(d => d.direction === 'payable');
        const payableMoney = payablePending
            .filter(d => d.debt_type === 'money')
            .reduce((sum, d) => sum + (Number(d.money_amount) || 0), 0);

        return {
            receivable: { count: receivablePending.length, money: receivableMoney },
            payable: { count: payablePending.length, money: payableMoney }
        };
    }, [debts]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Deudas / Anotaciones</h1>
                    <p className="text-muted-foreground mt-1">Administra deudas pendientes y registros.</p>
                </div>
                <Link to="/admin/debts/new">
                    <Button className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" /> Nueva Deuda
                    </Button>
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Receivable Card */}
                <div className="bg-card p-6 rounded-xl border-l-4 border-l-green-500 border-y border-r border-border shadow-md relative overflow-hidden transition-all hover:shadow-lg">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ArrowDownLeft className="w-24 h-24 text-green-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg">
                                <ArrowDownLeft className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-foreground">Por Cobrar (Pendientes)</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-green-600 dark:text-green-400">${summary.receivable.money.toLocaleString('es-AR')}</span>
                            <span className="text-sm text-muted-foreground">en {summary.receivable.count} registros</span>
                        </div>
                    </div>
                </div>

                {/* Payable Card */}
                <div className="bg-card p-6 rounded-xl border-l-4 border-l-red-500 border-y border-r border-border shadow-md relative overflow-hidden transition-all hover:shadow-lg">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ArrowUpRight className="w-24 h-24 text-red-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                            <h3 className="font-semibold text-foreground">Por Pagar (Pendientes)</h3>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-red-600 dark:text-red-400">${summary.payable.money.toLocaleString('es-AR')}</span>
                            <span className="text-sm text-muted-foreground">en {summary.payable.count} registros</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4 md:flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o motivo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 h-10 rounded-md bg-muted/50 border border-input text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm transition-all"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <select
                        value={directionFilter}
                        onChange={(e) => setDirectionFilter(e.target.value)}
                        className="h-10 px-3 rounded-md border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                        <option value="all">Todas las Direcciones</option>
                        <option value="receivable">📥 Por Cobrar</option>
                        <option value="payable">📤 Por Pagar</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-3 rounded-md border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                        <option value="all">Todos los Estados</option>
                        <option value="pending">Pendientes</option>
                        <option value="paid">Saldadas</option>
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="h-10 px-3 rounded-md border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                        <option value="all">Todos los Tipos</option>
                        <option value="money">Dinero</option>
                        <option value="item">Objetos</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="h-10 px-3 flex items-center gap-2 rounded-md border border-input bg-card text-foreground text-sm hover:bg-muted transition-colors"
                    >
                        <ArrowUpDown className="w-4 h-4" />
                        {sortOrder === 'desc' ? 'Recientes' : 'Antiguos'}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Dirección</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Persona</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Tipo</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Detalle</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Fecha</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-center">Estado</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">Cargando...</td>
                                </tr>
                            ) : filteredDebts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">No se encontraron deudas.</td>
                                </tr>
                            ) : (
                                filteredDebts.map((debt) => (
                                    <tr
                                        key={debt.id}
                                        className={`hover:bg-muted/30 transition-colors border-l-4 ${debt.direction === 'receivable' ? 'border-l-green-500' :
                                            debt.direction === 'payable' ? 'border-l-red-500' : 'border-l-transparent'
                                            }`}
                                    >
                                        <td className="px-6 py-4">
                                            {debt.direction === 'receivable' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                                                    📥 Por Cobrar
                                                </span>
                                            ) : debt.direction === 'payable' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                                    📤 Por Pagar
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            {debt.person_name}
                                            {debt.reason && <p className="text-xs text-muted-foreground font-normal truncate max-w-[150px]">{debt.reason}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {debt.debt_type === 'money' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                                    Dinero
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                    Objeto
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-foreground">
                                            {debt.debt_type === 'money' ? (
                                                <span>${Number(debt.money_amount).toLocaleString('es-AR')} {debt.money_currency}</span>
                                            ) : (
                                                <span>{debt.item_quantity && `${Number(debt.item_quantity)}x `}{debt.item_name}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {new Date(debt.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <div
                                                    className="scale-75 origin-center"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Stop row click
                                                    }}
                                                >
                                                    <Toggle
                                                        checked={debt.status === 'paid'}
                                                        onCheckedChange={() => handleStatusToggle(debt)}
                                                        labelLeft="Pend."
                                                        labelRight="Pagada"
                                                        activeClass="bg-green-500"
                                                        inactiveClass="bg-red-500"
                                                        className="w-40"
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                                    onClick={() => setViewDebtId(debt.id)}
                                                    title="Ver detalle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Link to={`/admin/debts/edit/${debt.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(debt.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Detail Modal */}
                {viewDebtId && (
                    <DebtDetailModal
                        debtId={viewDebtId}
                        onClose={() => setViewDebtId(null)}
                    />
                )}
            </div>
        </div>
    );
}
