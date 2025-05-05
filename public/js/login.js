document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const { id_responsable, isAdmin, id_service } = await response.json();

            // Stocke les informations dans localStorage (optionnel, mais utile pour debug)
            localStorage.setItem('id_responsable', id_responsable);
            localStorage.setItem('isAdmin', isAdmin);
            localStorage.setItem('id_service', id_service);

            // ✅ Stocke aussi les infos dans des cookies accessibles à tout le site
            document.cookie = `id_responsable=${id_responsable}; path=/;`;
            document.cookie = `id_service=${id_service}; path=/;`;
            document.cookie = `isAdmin=${isAdmin}; path=/;`;

            // Redirige vers la page d'accueil
            window.location.href = '/accueil';
        } else {
            alert('Identifiant ou mot de passe incorrect.');
        }
    } catch (error) {
        console.error('Erreur lors de la connexion :', error);
        alert('Une erreur est survenue. Veuillez réessayer.');
    }
});
