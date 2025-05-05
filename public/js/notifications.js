document.addEventListener('DOMContentLoaded', async () => {
    const notifBtn = document.getElementById('notifications-btn');
    const notifContainer = document.getElementById('notifications-container');
    const listContainer = document.getElementById('notifications-list');
    const markAllReadBtn = document.getElementById('mark-all-read');
    
    document.addEventListener('click', (e) => {
        // Vérifie si l'élément cliqué est en dehors du conteneur de notifications et du bouton
        if (notifContainer && notifBtn && !notifContainer.contains(e.target) && e.target !== notifBtn) {
            notifContainer.classList.add('hidden'); // Cache le container
        }
    });

    // ✅ Charger les notifications immédiatement
    await loadNotifications();

    // 🎯 Rafraîchir les notifications toutes les 3 secondes
    setInterval(async () => {
        await loadNotifications();
    }, 3000);

    // 🎯 Toggle affichage des notifications
    notifBtn.addEventListener('click', async () => {
        notifContainer.classList.toggle('hidden');
        if (!notifContainer.classList.contains('hidden')) {
            await markAllNotificationsAsRead();
        }
    });

});

// 🔥 Fonction pour charger les notifications depuis l'API
const loadNotifications = async () => {
    try {
        const idResponsable = getCookie('id_responsable');
        if (!idResponsable) return;

        const response = await fetch('/api/notifications', { 
            method: 'GET', 
            headers: { 'id-responsable': idResponsable } 
        });

        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

        let notifications = await response.json();

        const listContainer = document.getElementById('notifications-list');
        listContainer.innerHTML = '';

        if (notifications.length === 0) {
            listContainer.innerHTML = '<p>Aucune notification.</p>';
        } else {
            // ✅ Trier les notifications de la plus récente à la plus ancienne
            notifications.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation));

            // ✅ Ajouter les notifications DANS LE BON ORDRE pour que la plus récente apparaisse en haut
            notifications.forEach(addNotificationToList);
        }

        // ✅ Ajuster le scroll pour afficher la plus récente en haut
        listContainer.scrollTop = 0;

        // ✅ Mettre à jour le badge avec les notifications non lues
        const unreadCount = notifications.filter(n => n.vu === 0).length;
        updateNotificationBadge(unreadCount);
    } catch (error) {
        console.error('❌ Erreur lors du chargement des notifications:', error);
    }
};

// 🔥 Fonction pour ajouter une notification dans la liste
const addNotificationToList = (notif) => {
    const listContainer = document.getElementById('notifications-list');

    const notifElement = document.createElement('div');
    notifElement.classList.add('notification-item');
    if (!notif.vu) {
        notifElement.classList.add('unread');
    }

    // 📌 Déterminer le message en fonction du type de notification
    let message = "";
    switch (parseInt(notif.type_notification, 10)) {
        case 0: // Type 0 = Mention
            message = `📢 Votre service a été mentionné dans un commentaire : "${notif.commentaire_contenu}"`;
            break;
        case 1: // Type 1 = Like sur un commentaire personnel
            message = `❤️ Quelqu'un a liké votre commentaire : "${notif.commentaire_contenu}"`;
            break;
        case 2: // Type 2 = Like sur un commentaire de votre discussion
            message = `💬 Un commentaire dans votre discussion a été liké : "${notif.commentaire_contenu}"`;
            break;
        default:
            message = `🔔 Nouvelle notification : "${notif.commentaire_contenu}"`;
            break;
    }

    notifElement.innerHTML = `
        <p>${message}</p>
        <span class="notification-time">${getElapsedTime(notif.date_creation)}</span>
        <button class="delete-notif-btn" data-id="${notif.id_notification}">❌</button>
    `;

    // 🎯 Suppression d'une notification au clic sur ❌
    const deleteBtn = notifElement.querySelector('.delete-notif-btn');
    deleteBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        await deleteNotification(notif.id_notification, notifElement);
        notifElement.remove();
        updateNotificationBadge();
    });

    // ✅ Ajouter CHAQUE notification à la FIN pour respecter l'ordre (plus récentes en haut)
    listContainer.appendChild(notifElement);
};


// 🔥 Fonction pour supprimer une notification
const deleteNotification = async (idNotification, notifElement) => {
    try {
        const response = await fetch(`/api/notifications/${idNotification}/delete`, { 
            method: 'DELETE' 
        });

        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

        console.log(`✅ Notification ${idNotification} supprimée.`);

        // ✅ Vérifier si l'élément existe avant de le supprimer du DOM
        if (notifElement && notifElement.parentNode) {
            notifElement.remove();
        } else {
            console.warn("⚠️ Impossible de trouver l'élément DOM à supprimer.");
        }

        // ✅ Mettre à jour le badge
        updateNotificationBadge();
    } catch (error) {
        console.error('❌ Erreur lors de la suppression de la notification:', error);
    }
};

// 🔥 Fonction pour marquer toutes les notifications comme lues
const markAllNotificationsAsRead = async () => {
    try {
        const idResponsable = getCookie('id_responsable');
        if (!idResponsable) return;

        await fetch('/api/notifications/mark-all-read', { 
            method: 'POST', 
            headers: { 'id-responsable': idResponsable } 
        });

        console.log("✅ Toutes les notifications marquées comme lues.");
        await loadNotifications();
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour des notifications:', error);
    }
};

// 🔴 Mise à jour du badge de notifications non lues
const updateNotificationBadge = (count) => {
    const notifCounter = document.getElementById('notif-counter');

    if (count > 0) {
        notifCounter.textContent = count;
        notifCounter.classList.remove('hidden');
    } else {
        notifCounter.classList.add('hidden');
    }
};
