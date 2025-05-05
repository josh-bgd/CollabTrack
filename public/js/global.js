// ===== HEADER FUNCTIONALITIES =====

/**
 * Configure le bouton de déconnexion.
 */
const setupLogout = () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/';
        });
    }
};

/**
 * Configure le bouton de retour.
 */
const setupBackButton = () => {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/accueil';
        });
    }
};

// ===== POPUP FUNCTIONALITIES =====

/**
 * Affiche un élément en supprimant la classe "hidden".
 * @param {HTMLElement} element 
 */
const showElement = (element) => {
    if (element) {
        element.classList.remove('hidden');
    }
};

/**
 * Cache un élément en ajoutant la classe "hidden".
 * @param {HTMLElement} element 
 */
const hideElement = (element) => {
    if (element) {
        element.classList.add('hidden');
    }
};

/**
 * Configure la gestion d'un popup.
 * @param {HTMLElement} popup - Élément popup à gérer.
 * @param {HTMLElement} openBtn - Bouton pour ouvrir le popup.
 * @param {HTMLElement} closeBtn - Bouton pour fermer le popup.
 */
const setupPopup = (popup, openBtn, closeBtn) => {
    if (popup && openBtn && closeBtn) {
        openBtn.addEventListener('click', () => showElement(popup));
        closeBtn.addEventListener('click', () => hideElement(popup));
    }
};

const formatServiceName = (name) => {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};


// Fonction pour calculer le temps écoulé
const getElapsedTime = (date, isModified = false) => {
    const now = new Date();
    const dateToCompare = new Date(date);

    // Ajouter 77 secondes pour compenser l'écart
    dateToCompare.setSeconds(dateToCompare.getSeconds() - 123);

    // Vérifiez si la date est valide
    if (isNaN(dateToCompare)) {
        console.error('Date invalide reçue :', date);
        return 'Date invalide';
    }

    const elapsedTime = Math.floor((now - dateToCompare) / 1000); // Temps écoulé en secondes

    if (elapsedTime < 60) {
        return `${isModified ? 'Modifié il y a' : 'Il y a'} ${elapsedTime} seconde${elapsedTime > 1 ? 's' : ''}`;
    } else if (elapsedTime < 3600) {
        const minutes = Math.floor(elapsedTime / 60);
        return `${isModified ? 'Modifié il y a' : 'Il y a'} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (elapsedTime < 86400) {
        const hours = Math.floor(elapsedTime / 3600);
        return `${isModified ? 'Modifié il y a' : 'Il y a'} ${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (elapsedTime < 2592000) {
        const days = Math.floor(elapsedTime / 86400);
        return `${isModified ? 'Modifié il y a' : 'Il y a'} ${days} jour${days > 1 ? 's' : ''}`;
    } else if (elapsedTime < 31536000) {
        const months = Math.floor(elapsedTime / 2592000);
        return `${isModified ? 'Modifié il y a' : 'Il y a'} ${months} mois`;
    } else {
        const years = Math.floor(elapsedTime / 31536000);
        return `${isModified ? 'Modifié il y a' : 'Il y a'} ${years} an${years > 1 ? 's' : ''}`;
    }
};

function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) return value;
    }
    return null;
}

const fetchServices = async () => {
    try {
        const response = await fetch('/api/services'); 
        if (!response.ok) throw new Error('Erreur API');

        const services = await response.json();

        // ✅ Vérifie si l'API retourne une liste d'objets { id_service, nom }
        if (Array.isArray(services) && services.length > 0 && typeof services[0] === "object") {
            return services; // Format correct
        }

        // ✅ Si l'API retourne juste une liste de noms (ancienne version)
        if (Array.isArray(services) && typeof services[0] === "string") {
            return services.map((nom, index) => ({ id_service: index + 1, nom }));
        }

        console.warn("⚠️ Format inattendu pour les services :", services);
        return [];
    } catch (error) {
        console.error("❌ Erreur lors du chargement des services :", error);
        return [];
    }
};

// ✅ Gestion des menus d'action (trois points)
document.addEventListener('click', (event) => {
    const button = event.target.closest('.materiels-action-btn');
    if (button) {
        const menu = button.nextElementSibling;

        document.querySelectorAll('.action-menu.visible').forEach(openMenu => {
            if (openMenu !== menu) {
                openMenu.classList.remove('visible');
            }
        });

        menu.classList.toggle('visible');
        event.stopPropagation();
        return;
    }

    if (!event.target.closest('.action-menu')) {
        document.querySelectorAll('.action-menu.visible').forEach(openMenu => {
            openMenu.classList.remove('visible');
        });
    }
});



document.addEventListener('DOMContentLoaded', async () => {

// Récupérer les informations de l'utilisateur via les cookies
const idService = getCookie('id_service');
const isAdmin = getCookie('isAdmin') === 'true';

const serviceNameElement = document.getElementById("service-name");

if (idService) {
    try {
        // Récupère directement le nom du service via l'API `/api/service/:id`
        const response = await fetch(`/api/service/${idService}`);
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

        const data = await response.json();
        serviceNameElement.textContent = formatServiceName(data.nom);
    } catch (error) {
        console.error("❌ Erreur lors du chargement du service :", error);
        serviceNameElement.textContent = "Erreur";
    }
} else {
    serviceNameElement.textContent = "Aucun service trouvé";
}   

// ===== INITIALISATION GLOBALE =====

    setupLogout();
    setupBackButton();
});
