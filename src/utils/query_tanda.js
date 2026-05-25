
const URL = "https://qfvdawqnfxoxzmpgqhaa.supabase.co/rest/v1/tandas?nombre=eq.Primera%20tanda%20FEBRERO&select=parametros";
const KEY = 'sb_publishable_-d-Qway4FjdBXE3Q9SBfvQ_Id9yEyha';

fetch(URL, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
})
    .then(res => res.json())
    .then(data => console.log(JSON.stringify(data, null, 2)))
    .catch(err => console.error(err));
