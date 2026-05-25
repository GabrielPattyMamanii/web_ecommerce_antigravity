import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const MiMercaderiaContext = createContext();

export function MiMercaderiaProvider({ children }) {
    const [mercanciaUser, setMercanciaUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [boletas, setBoletas] = useState([]);
    const [tandasBoletas, setTandasBoletas] = useState([]);

    // Fetch Tandas (Global)
    const fetchTandas = async () => {
        try {
            const { data, error } = await supabase
                .from('tandas')
                .select('*')
                .order('fecha', { ascending: false });
            if (error) throw error;
            setTandasBoletas(data);
        } catch (error) {
            console.error('Error fetching tandas:', error);
        }
    };

    // Fetch Boletas (User specific due to RLS)
    const fetchBoletas = async () => {
        try {
            const { data, error } = await supabase
                .from('boletas')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;

            // Map DB snake_case to frontend camelCase
            const mappedBoletas = data.map(b => ({
                ...b,
                houseName: b.house_name,
                customBundles: b.custom_bundles,
                tandaId: b.tanda_id,
                imageUrl: b.image_url
            }));
            setBoletas(mappedBoletas);
        } catch (error) {
            console.error('Error fetching boletas:', error);
        }
    };

    // Helper: Get CANT_BULTOS_PAGAR_ID for a specific boleta
    const getCANT_BULTOS_PAGAR_ID = (boletaId) => {
        const boleta = boletas.find(b => b.id === boletaId);
        if (!boleta || !boleta.estado) return 0;

        return boleta.customBundles && parseFloat(boleta.customBundles) > 0
            ? parseFloat(boleta.customBundles)
            : boleta.items.reduce((sum, item) => sum + (parseFloat(item.bultos) || 0), 0);
    };

    // Helper: Get total CANTIDAD_BULTOS_A_PAGAR for entire Tanda
    const getTotalBultosAPagar = (tandaId) => {
        const boletasInTanda = boletas.filter(b => b.tandaId === tandaId && b.estado === true);
        return boletasInTanda.reduce((sum, b) => {
            const bultosCount = b.customBundles && parseFloat(b.customBundles) > 0
                ? parseFloat(b.customBundles)
                : b.items.reduce((itemSum, item) => itemSum + (parseFloat(item.bultos) || 0), 0);
            return sum + bultosCount;
        }, 0);
    };

    // --- Supabase Auth & Profiles Sync ---
    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchProfile(session.user.id);
            } else {
                setMercanciaUser(null);
                setLoading(false);
            }
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                fetchProfile(session.user.id);
                fetchTandas();
                fetchBoletas();
            } else {
                setMercanciaUser(null);
                setBoletas([]);
                setTandasBoletas([]); // Optional: keep tandas visible if public
                setLoading(false);
            }
        });

        // 3. Fetch initial data
        fetchTandas();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) fetchBoletas();
        });

        // 4. Fetch all profiles for the admin list
        fetchAllProfiles();

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setMercanciaUser(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const [authorizedUsers, setAuthorizedUsers] = useState([]);

    const fetchAllProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('username', { ascending: true });

            if (error) throw error;
            setAuthorizedUsers(data);
        } catch (error) {
            console.error('Error fetching all profiles:', error);
        }
    };

    const loginMercancia = async (identifier, password) => {
        let email = identifier;

        // If it doesn't look like an email, try fetching from profiles
        if (!identifier.includes('@')) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', identifier)
                .single();

            if (profile) email = profile.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const registerUser = async (username, email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                },
            },
        });

        if (error) throw error;

        // Profiles are created via trigger in Supabase (as per SQL in implementation plan)
        // We might need to refresh the list
        fetchAllProfiles();

        return data;
    };

    const resendUserInvite = async (email) => {
        const { data, error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        });

        if (error) throw error;
        return data;
    };

    const logoutMercancia = async () => {
        await supabase.auth.signOut();
        setMercanciaUser(null);
    };

    const updateUserProfile = async (userId, updates) => {
        try {
            // Update auth password if provided
            if (updates.password) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: updates.password
                });
                if (authError) throw authError;
                delete updates.password; // Don't save password in profiles table
            }

            // Update profiles table
            const { error } = await supabase
                .from('profiles')
                .update({ ...updates, updated_at: new Date() })
                .eq('id', userId);

            if (error) throw error;

            // Refresh current user if it's the one being updated
            if (mercanciaUser && mercanciaUser.id === userId) {
                fetchProfile(userId);
            }
            fetchAllProfiles();
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    };

    const deleteUser = async (id) => {
        // Note: Real user deletion usually requires service role.
        // For now we just remove the profile or tell the user to delete from Supabase Dashboard.
        // If we want to delete from auth.users, we'd need an Edge Function.
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;
        fetchAllProfiles();
    };

    const validateUser = async (username, password) => {
        // Local logic is replaced by Supabase signIn
        // This function is now deprecated but we keep signature if used in components
        // Actually it's better to just return the Supabase session
        return null;
    };

    // --- Boletas & Tandas Logic ---

    // Update Tanda parametros
    const updateTandaParametros = async (tandaId, parametros) => {
        try {
            // Get current params first to merge
            const currentTanda = tandasBoletas.find(t => t.id === tandaId);
            const currentParams = currentTanda ? currentTanda.parametros : {};
            const newParams = { ...currentParams, ...parametros };

            const { error } = await supabase
                .from('tandas')
                .update({ parametros: newParams })
                .eq('id', tandaId);

            if (error) throw error;
            fetchTandas();
        } catch (error) {
            console.error('Error updating tanda parameters:', error);
        }
    };

    // Toggle boleta estado (TRUE/FALSE)
    const toggleBoletaEstado = async (boletaId) => {
        try {
            const currentBoleta = boletas.find(b => b.id === boletaId);
            if (!currentBoleta) return;

            const { error } = await supabase
                .from('boletas')
                .update({ estado: !currentBoleta.estado })
                .eq('id', boletaId);

            if (error) throw error;
            fetchBoletas();
        } catch (error) {
            console.error('Error toggling boleta status:', error);
        }
    };

    // --- Boletas CRUD ---
    const addBoleta = async (boleta) => {
        try {
            // Remove ID if present (let Supabase generate it)
            const { id, imageFile, ...boletaData } = boleta;

            // Map frontend keys to DB keys if necessary (e.g. tandaId -> tanda_id)
            const dbBoleta = {
                ...boletaData,
                tanda_id: boleta.tandaId,
                house_name: boleta.houseName, // Map unique key
                items: boleta.items,
                custom_bundles: boleta.customBundles,
                user_id: mercanciaUser.id // Ensure strictly linked to current user
            };

            // Remove camelCase and frontend-only keys that were mapped
            delete dbBoleta.tandaId;
            delete dbBoleta.houseName;
            delete dbBoleta.customBundles;
            delete dbBoleta.imageFile;
            delete dbBoleta.imageUrl; // Ensure this is removed to avoid DB error

            // Insert boleta first to get the ID
            const { data: insertedBoleta, error: insertError } = await supabase
                .from('boletas')
                .insert([dbBoleta])
                .select()
                .single();

            if (insertError) throw insertError;

            // Upload image if provided
            if (imageFile && insertedBoleta) {
                const fileName = `${mercanciaUser.id}/${insertedBoleta.id}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from('boleta-images')
                    .upload(fileName, imageFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('boleta-images')
                    .getPublicUrl(fileName);

                // Update boleta with image URL
                const { error: updateError } = await supabase
                    .from('boletas')
                    .update({ image_url: publicUrl })
                    .eq('id', insertedBoleta.id);

                if (updateError) throw updateError;
            }

            fetchBoletas();
        } catch (error) {
            console.error('Error adding boleta:', error);
            throw error;
        }
    };

    const updateBoleta = async (updatedBoleta) => {
        try {
            const { id, imageFile, ...boletaData } = updatedBoleta;

            // Map frontend keys to DB keys if necessary
            const dbBoleta = {
                ...boletaData,
                tanda_id: updatedBoleta.tandaId,
                house_name: updatedBoleta.houseName,
                items: updatedBoleta.items,
                custom_bundles: updatedBoleta.customBundles,
            };
            // Remove camelCase and frontend-only keys
            delete dbBoleta.tandaId;
            delete dbBoleta.houseName;
            delete dbBoleta.customBundles;
            delete dbBoleta.imageFile;
            delete dbBoleta.imageUrl; // Ensure this is removed to avoid DB error

            // Upload new image if provided
            if (imageFile) {
                const fileName = `${mercanciaUser.id}/${id}.webp`;

                // Delete old image if exists
                await supabase.storage
                    .from('boleta-images')
                    .remove([fileName]);

                // Upload new image
                const { error: uploadError } = await supabase.storage
                    .from('boleta-images')
                    .upload(fileName, imageFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('boleta-images')
                    .getPublicUrl(fileName);

                // Add image URL to update data
                dbBoleta.image_url = publicUrl;
            } else if (updatedBoleta.imageUrl === null) {
                // If the user explicitly removed the image (imageUrl became null)
                // and no new imageFile was provided, delete from storage
                const fileName = `${mercanciaUser.id}/${id}.webp`;
                await supabase.storage
                    .from('boleta-images')
                    .remove([fileName]);

                dbBoleta.image_url = null;
            }

            const { error } = await supabase
                .from('boletas')
                .update(dbBoleta)
                .eq('id', id);

            if (error) throw error;
            fetchBoletas();
        } catch (error) {
            console.error('Error updating boleta:', error);
            throw error;
        }
    };

    const deleteBoleta = async (id) => {
        try {
            // Get boleta to check if it has an image
            const boleta = boletas.find(b => b.id === id);

            // Delete image from storage if exists
            if (boleta && boleta.imageUrl) {
                const fileName = `${mercanciaUser.id}/${id}.webp`;
                await supabase.storage
                    .from('boleta-images')
                    .remove([fileName]);
            }

            // Delete boleta from database
            const { error } = await supabase
                .from('boletas')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchBoletas();
        } catch (error) {
            console.error('Error deleting boleta:', error);
            throw error;
        }
    };

    // --- Tandas CRUD ---
    const addTandaBoleta = async (tanda) => {
        try {
            const { id, ...tandaData } = tanda;
            const { error } = await supabase
                .from('tandas')
                .insert([{
                    nombre: tanda.nombre,
                    fecha: tanda.fecha,
                    parametros: tanda.parametros,
                    created_by: mercanciaUser?.id || null
                }]);

            if (error) throw error;
            fetchTandas();
        } catch (error) {
            console.error('Error adding tanda:', error);
            throw error;
        }
    };

    const deleteTandaBoleta = async (id) => {
        try {
            const { error } = await supabase
                .from('tandas')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchTandas();
        } catch (error) {
            console.error('Error deleting tanda:', error);
        }
    };



    return (
        <MiMercaderiaContext.Provider value={{
            mercanciaUser,
            loginMercancia,
            logoutMercancia,
            loading,
            boletas,
            addBoleta,
            updateBoleta,
            deleteBoleta,
            toggleBoletaEstado,
            tandasBoletas,
            addTandaBoleta,
            deleteTandaBoleta,
            updateTandaParametros,
            getCANT_BULTOS_PAGAR_ID,
            getTotalBultosAPagar,
            // User Management Exports
            authorizedUsers,
            registerUser,
            resendUserInvite,
            deleteUser,
            validateUser,
            updateUserProfile,
            fetchAllProfiles
        }}>
            {children}
        </MiMercaderiaContext.Provider>
    );
}

export const useMercanciaUser = () => useContext(MiMercaderiaContext);
