document.addEventListener('DOMContentLoaded', () => {
    // ===== UTILITAIRES =====

    /**
     * Récupère un paramètre de l'URL.
     * @param {string} param - Le nom du paramètre.
     * @returns {string|null} - La valeur du paramètre ou null.
     */
    const getQueryParam = (param) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    };

    // ===== VARIABLES =====
    const collaborateurId = getQueryParam('id');
    if (!collaborateurId) {
        console.error("Collaborateur ID manquant dans l'URL.");
        return;
    }

    // ===== FONCTIONS =====

    // --- Données du collaborateur ---
    /**
     * Charge et affiche les données du collaborateur.
     */
    const loadCollaborateurData = async () => {
        try {
            const response = await fetch(`/api/collaborateur/${collaborateurId}`);
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}`);
            }
            const data = await response.json();
            console.log('Données du collaborateur récupérées :', data);
            document.getElementById('collaborateur-nom').textContent = `${data.prenom} ${data.nom}`;
            document.getElementById('collaborateur-service').textContent = formatServiceName(data.service);
        } catch (error) {
            console.error('Erreur lors du chargement des données du collaborateur :', error);
        }
    };    

    // --- Matériels ---
    /**
     * Charge et affiche les matériels du collaborateur.
     */
    const loadMateriels = async () => {
        try {
            const response = await fetch(`/api/collaborateur/${collaborateurId}/materiels`);
            const materiels = await response.json();

            const idService = localStorage.getItem('id_responsable'); 
            const isRHOrInformatique = idService === '5' || idService === '6' ;
    
            const container = document.getElementById('materiels-container');
            container.innerHTML = ''; // Réinitialiser le conteneur
    
            materiels.forEach((materiel) => {
                const card = document.createElement('div');
                card.classList.add('collabo-materiel-card'); // Classe spécifique aux matériels du collabo
                card.setAttribute('data-idMateriel', materiel.id_materiel); // Ajouter l'id_materiel
                card.setAttribute('data-idCollaborateur', collaborateurId); // Ajouter l'id_collaborateur depuis l'URL

                card.innerHTML = `
                    <div class="materiel-header">
                        <div class="materiel-image-container">
                            <img src="${getImageForType(materiel.id_type)}" class="materiel-img" alt="Image du matériel">
                        </div>
                        <div class="materiel-details">
                            <div class="materiel-details-first-line">
                                <p>${materiel.modele}</p>
                                <div class="card-actions">
                                    <button class="materiels-action-btn">⋮</button>
                                    <div class="action-menu hidden">
                                        <button class="action-item" data-action="rendu">Matériel rendu</button>
                                        <button class="action-item" data-action="perdu">Matériel perdu</button>
                                        ${
                                            isRHOrInformatique
                                                ? `<button class="action-item" data-action="supprimer">Supprimer matériel</button>`
                                                : ''
                                        }
                                    </div>
                                </div>
                            </div>
                            <p><strong>${materiel.marque}</strong></p>
                            ${materiel.num_serie
                            ?`<p class="num-serie">N° Série: <br> ${materiel.num_serie}</p>`
                            :`<p class="num-serie">N° Série: <br> Aucun</p>`}
                        </div>
                    </div>
                    <div class="materiel-etat">
                        <small class="etat">${materiel.etat}</small>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des matériels:', error);
        }
    };

    // Fonction pour mapper les ID types aux images
    const getImageForType = (idType) => {
        switch (idType) {
            case 1: return "images/clavier.jpg";
            case 2: return "images/souris.jpg";
            case 3:
            case 4: return "images/ecran.jpg";
            case 5: return "images/telephone.jpg";
            case 6: return "images/ordinateur.jpg";
            case 7: return "images/sacoche.jpg";
            case 8: return "images/tablette.jpg";
            case 9: return "images/tour.jpg";
            case 10: return "images/imprimante.jpg";
            default: return "images/default.jpg"; // Image par défaut si le type est inconnu
        }
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

    // --- Commentaires ---
    /**
     * Charge et affiche les commentaires avec réponses imbriquées.
     */
    const loadCommentaires = async () => {
        try {
            const idResponsable = localStorage.getItem('id_responsable');
            if (!idResponsable) {
                console.error('ID du responsable non trouvé dans localStorage.');
                return;
            }
    
            // Fetch des commentaires et des likes
            const [responseCommentaires, responseLikes] = await Promise.all([
                fetch(`/api/collaborateur/${collaborateurId}/commentaires`),
                fetch(`/api/responsable/${idResponsable}/likes`),
            ]);
    
            const commentaires = await responseCommentaires.json();
            const likedComments = await responseLikes.json();
    
            // Ajouter `user_liked` à tous les commentaires
            commentaires.forEach(comment => {
                comment.user_liked = likedComments.includes(comment.id_commentaire);
            });
    
            const container = document.getElementById('commentaires-container');
            container.innerHTML = '';
    
            // Filtrer les commentaires racines
            const racineCommentaires = commentaires.filter(comment => !comment.reponse_a);
    
            // Générer et afficher les commentaires racines
            racineCommentaires.forEach(comment => {
                const commentCard = generateCommentCard(comment, commentaires);
                if (commentCard) {
                    container.appendChild(commentCard);
                }
            });
    
            if (racineCommentaires.length === 0) {
                container.innerHTML = '<p>Aucun commentaire pour le moment. Soyez le premier à commenter !</p>';
            }
        } catch (error) {
            console.error('Erreur lors du chargement des commentaires:', error);
        }
    };     
    
    const hasVisibleDescendant = (comment, allComments) => {
        const replies = allComments.filter(c => c.reponse_a === comment.id_commentaire);
        
        // Si un des descendants est visible, on garde la chaîne
        return replies.some(reply => !reply.supprime || hasVisibleDescendant(reply, allComments));
    };
    
    /**
     * Génère une carte de commentaire avec réponses imbriquées.
     */
    const generateCommentCard = (comment, allComments) => {
        // Vérifier si le commentaire est supprimé
        const isDeleted = comment.supprime; 
    
        // Vérifier si le commentaire a des réponses
        const replies = allComments.filter(c => c.reponse_a === comment.id_commentaire);
        
        if (isDeleted && !hasVisibleDescendant(comment, allComments)) {
            return null; // On ne crée pas la carte
        }    
    
        const card = document.createElement('div');
        card.classList.add('comment-card');
        card.setAttribute('data-id', comment.id_commentaire);
    
        const idResponsable = localStorage.getItem('id_responsable');
        const isOwner = idResponsable && idResponsable === comment.id_responsable.toString();
    
        // Déterminer si c'est une réponse
        if (comment.reponse_a) {
            card.classList.add('reply');
        }
    
        const isModified = comment.date_modification !== null;
        const dateToUse = isModified ? comment.date_modification : comment.date_creation;
    
        // Si le commentaire est supprimé, on affiche le message en grisé
        const commentContent = isDeleted 
            ? `<p class="deleted-comment">Ce commentaire a été supprimé.</p>` 
            : `<p>${comment.contenu}</p>`;
    
        card.innerHTML = `
            <div class="comment-card-content">
                <div class="comment-header flex-between">
                    <div class="comment-meta">
                        <strong class="service">${formatServiceName(comment.service_nom || 'Service inconnu')}</strong>
                        <small class="comment-time">${getElapsedTime(dateToUse, isModified)}</small>
                        ${!isDeleted ? `<span class="separator">•</span>
                        <small class="like-count" data-id="${comment.id_commentaire}">${comment.likes} J'aime</small>` : ''}
                    </div>
                    <div class="like-container">
                        ${!isDeleted ? `<i class="like-btn ${comment.user_liked ? 'liked' : ''}" data-id="${comment.id_commentaire}"></i>` : ''}
                        <div class="explosion"></div>
                    </div>
                </div>
                <div class="comment-content">
                    ${commentContent}
                </div>
                ${!isDeleted 
                    ? `<div class="actions">
                        <span class="reply-btn" data-id="${comment.id_commentaire}" data-service="${comment.service_nom}">Répondre</span>
                        ${isOwner ? `<span class="edit-btn">Modifier</span>
                                     <span class="delete-btn" data-id="${comment.id_commentaire}"><i class="fa fa-trash"></i> Supprimer</span>` : ''}
                    </div>`
                    : ''
                }
            </div>
        `;
    
        // Ajouter un conteneur pour les réponses si besoin
        let repliesContainer = document.createElement('div');
        repliesContainer.classList.add('replies-container');
        card.appendChild(repliesContainer);
    
        // Ajouter les réponses imbriquées
        replies.forEach(reply => {
            const replyCard = generateCommentCard(reply, allComments);
            if (replyCard) {
                repliesContainer.appendChild(replyCard);
            }
        });
    
        // Ajouter les événements uniquement si le commentaire n'est pas supprimé
        if (!isDeleted) {
            const replyBtn = card.querySelector('.reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', () => {
                    showReplyForm(comment.id_commentaire, repliesContainer, replyBtn.getAttribute('data-service'));
                });
            }
    
            const editBtn = card.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => enableEditMode(card, comment.id_commentaire, comment.contenu));
            }
    
            const deleteBtn = card.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => confirmDeleteComment(comment.id_commentaire));
            }
    
            const likeBtn = card.querySelector('.like-btn');
            if (likeBtn) {
                likeBtn.addEventListener('click', () => toggleLike(comment.id_commentaire));
            }
        }
    
        return card;
    };
    

    // Modification d'un commentaire 
    const enableEditMode = (card, commentaireId, currentContent) => {
        const contentDiv = card.querySelector('.comment-content');
        const commentMeta = card.querySelector('.comment-meta');
    
        if (!contentDiv) {
            console.error('Impossible de trouver le conteneur de contenu pour le commentaire.');
            return;
        }
    
        // Sauvegarder l'ancien contenu
        const oldContent = contentDiv.innerHTML;
    
        // Passer en mode édition
        contentDiv.innerHTML = `
            <textarea class="edit-textarea">${currentContent}</textarea>
            <div class="edit-actions">
                <button class="validate-btn">Valider</button>
                <button class="cancel-btn">Annuler</button>
            </div>
        `;
    
        // Gestion des événements pour les boutons
        const validateBtn = contentDiv.querySelector('.validate-btn');
        const cancelBtn = contentDiv.querySelector('.cancel-btn');
    
        // Gestion de la validation
        validateBtn.addEventListener('click', async () => {
            const newContent = card.querySelector('.edit-textarea').value.trim();
            if (newContent) {
                const newDate = await updateComment(commentaireId, newContent);
        
                if (newDate) {
                    console.log('Nouvelle date utilisée :', newDate);
        
                    // Mettre à jour le contenu affiché
                    contentDiv.innerHTML = `<p>${newContent}</p>`;
        
                    // Vérifier que la date est bien une chaîne
                    const elapsedTime = getElapsedTime(newDate, true);
                    commentMeta.innerHTML = `
                        <small class="comment-time">${elapsedTime}</small>
                        <span class="separator">•</span>
                        <small class="like-count">${commentMeta.querySelector('.like-count').textContent}</small>
                    `;
                }
            } else {
                alert('Le contenu du commentaire ne peut pas être vide.');
            }
        });        
    
        // Gestion de l'annulation
        cancelBtn.addEventListener('click', () => {
            // Restaurer l'ancien contenu
            contentDiv.innerHTML = oldContent;
        });
    };    
    
    const updateComment = async (commentaireId, newContent) => {
        try {
            const response = await fetch(`/api/commentaires/${commentaireId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contenu: newContent }),
            });
    
            if (response.ok) {
                const updatedData = await response.json();
                console.log('Données mises à jour reçues :', updatedData);
    
                // Retourner uniquement la date_modification
                return updatedData.date_modification;
            } else {
                console.error('Erreur serveur lors de la mise à jour du commentaire.');
            }
        } catch (error) {
            console.error('Erreur lors de la requête de mise à jour :', error);
        }
    };    
    

    const toggleLike = async (commentaireId) => {
        try {
            const idResponsable = localStorage.getItem('id_responsable'); // ID responsable
            if (!idResponsable) {
                console.error('ID responsable manquant.');
                return;
            }
    
            const url = `/api/commentaires/${commentaireId}/toggle-like`;
            
            // Envoyer la requête à l'API
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_responsable: idResponsable }),
            });
    
            if (response.ok) {
                const data = await response.json(); // Récupère l'état mis à jour
                console.log(`Nouveau nombre de likes pour le commentaire ID: ${commentaireId} = ${data.likes}`);
                
                // Mettre à jour le DOM
                const commentCard = document.querySelector(`.comment-card[data-id="${commentaireId}"]`);
                const likeCounter = commentCard.querySelector('.like-count'); // Cibler précisément le compteur
                const likeBtn = commentCard.querySelector('.like-btn');
                const explosion = commentCard.querySelector('.explosion');
    
                if (likeCounter) {
                    likeCounter.textContent = `${data.likes} J'aime`; // Mettre à jour le compteur
                }
    
                if (likeBtn) {
                    likeBtn.classList.toggle('liked', data.isLiked); // Basculer l'état visuel basé sur la réponse

                    // Ajouter une animation (redémarrer l'animation)
                    likeBtn.classList.remove('grow-animation');
                    void likeBtn.offsetWidth; 
                    likeBtn.classList.add('grow-animation');
                }

                if (data.isLiked) {
                    triggerExplosion(explosion);
                }

            } else {
                console.error('Erreur lors de la requête de like:', response.statusText);
            }
        } catch (error) {
            console.error('Erreur lors de la requête de toggle-like:', error);
        }
    };    
    

    // Fonction pour déclencher l'explosion
    const triggerExplosion = (explosion) => {
        if (!explosion) return;

        // Supprimer les particules existantes
        explosion.innerHTML = '';

        // Générer des particules
        for (let i = 0; i < 10; i++) {
            const particle = document.createElement('span');
            const angle = (Math.PI * 2 * i) / 10; // Répartir les particules en cercle
            particle.style.setProperty('--x', Math.cos(angle));
            particle.style.setProperty('--y', Math.sin(angle));
            explosion.appendChild(particle);
        }

        // Supprimer les particules après l'animation
        setTimeout(() => {
            explosion.innerHTML = '';
        }, 600);
    };

    /**
     * Affiche un formulaire pour répondre à un commentaire.
     */
    const showReplyForm = (parentCommentId, repliesContainer, serviceName) => {
        // Vérifiez s'il existe déjà un formulaire actif
        const existingForm = repliesContainer.querySelector('.reply-form');
        if (existingForm) {
            console.log('Un formulaire de réponse est déjà actif pour ce commentaire.');
            return;
        }
    
        // Créez le formulaire de réponse
        const form = document.createElement('form');
        form.classList.add('reply-form');
        form.innerHTML = `
            <textarea id="nouveau-commentaire" placeholder="Répondre..." required>@${serviceName} </textarea>
            <button type="submit">Envoyer</button>
            <button type="button" class="cancel-reply-btn">Annuler</button>
        `;
    
        // Ajoutez le formulaire au conteneur des réponses existant
        repliesContainer.appendChild(form);
    
        // Empêcher la suppression de l'@mention
        const replyBox = form.querySelector('#nouveau-commentaire');
        replyBox.addEventListener('keydown', (e) => {
            if (e.target.selectionStart <= `@${serviceName} `.length && (e.key === 'Backspace' || e.key === 'Delete')) {
                e.preventDefault();
            }
        });
    
        // Gestion de l'annulation
        const cancelBtn = form.querySelector('.cancel-reply-btn');
        cancelBtn.addEventListener('click', () => form.remove());
    
        // Gestion de la soumission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const texte = form.querySelector('textarea').value.trim();
            if (texte) {
                await publierCommentaire(texte, parentCommentId);
                form.remove(); // Supprimer le formulaire après l'envoi
                loadCommentaires(); // Recharger les commentaires
            }
        });
    };         
    

// ===== Confirmation de suppression =====
const confirmDeleteComment = (commentId) => {
    commentToDeleteId = commentId; // Stocker l'ID
    const popup = document.getElementById('delete-popup');
    popup.classList.remove('hidden'); // Afficher le popup
};

// ===== Gestion du popup de suppression =====
const setupDeletePopup = () => {
    const popup = document.getElementById('delete-popup');
    const confirmButton = document.getElementById('confirm-delete');
    const cancelButton = document.getElementById('cancel-delete');

    // Confirmer la suppression
    confirmButton.addEventListener('click', async () => {
        if (commentToDeleteId) {
            try {
                const response = await fetch(`/api/commentaires/${commentToDeleteId}/supprimer`, { 
                    method: 'PUT', // Remplace DELETE par PUT
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ supprime: true }) // Mise à jour du champ "supprime"
                });

                if (response.ok) {
                    console.log('Commentaire marqué comme supprimé avec succès');
                    loadCommentaires(); // Recharger les commentaires
                } else {
                    console.error('Erreur lors de la suppression du commentaire.');
                }
            } catch (error) {
                console.error('Erreur lors de la suppression du commentaire:', error);
            } finally {
                popup.classList.add('hidden'); // Cacher le popup
                commentToDeleteId = null; // Réinitialiser l'ID
            }
        }
    });

    // Annuler la suppression
    cancelButton.addEventListener('click', () => {
        popup.classList.add('hidden'); // Cacher le popup
        commentToDeleteId = null; // Réinitialiser l'ID
    });
};

    /**
     * Publie un commentaire ou une réponse.
     */
    const publierCommentaire = async (contenu, parentCommentId = null) => {
        const id_responsable = localStorage.getItem('id_responsable'); // Assurez-vous que cet ID est stocké lors de la connexion
    
        if (!id_responsable) {
            console.error('ID responsable manquant.');
            return;
        }
    
        try {
            const response = await fetch(`/api/collaborateur/${collaborateurId}/commentaires`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contenu, id_responsable, reponse_a: parentCommentId }),
            });
    
            if (response.ok) {
                console.log('Commentaire publié avec succès');
                loadCommentaires(); // Recharger les commentaires
            } else {
                console.error('Erreur lors de la publication du commentaire.');
            }
        } catch (error) {
            console.error('Erreur lors de la publication du commentaire:', error);
        }
    };
    
    // Ouverture de la popup pour ajouter un matériel
    document.getElementById('ajouter-materiel').addEventListener('click', async () => {
    const popup = document.getElementById('materiels-popup');
    const materielsList = document.getElementById('materiels-list');
    const validateButton = document.getElementById('validate-materiel');
    
    // Réinitialiser l'état de la popup
    materielsList.innerHTML = '';
    validateButton.disabled = true; // Désactiver le bouton valider

    // Fetcher les matériels disponibles
    try {
        const response = await fetch('/api/materiels/disponibles');
        if (response.ok) {
            const materiels = await response.json();
            
            if (materiels.length > 0) {
                materiels.forEach(materiel => {
                     // Ne pas afficher les matériels marqués comme "perdus"
                     if (materiel.perdu) return; // On ignore ce matériel s'il est perdu

                    const card = document.createElement('div');
                    card.classList.add('materiel-card');

                    card.innerHTML = `
                    <div class="materiel-info">
                        <div class="materiel-header">
                            <div class="materiel-image-container">
                                <img src="${getImageForType(materiel.id_type)}" class="materiel-img" alt="Image du matériel">
                            </div>
                            <div class="materiel-details">
                            <p>${materiel.modele}</p>
                            <p><strong>${materiel.marque}</strong></p>
                        <p class="num-serie">N° Série: ${materiel.num_serie}</p>
                            </div>
                        </div>
                        <div class="materiel-etat">${materiel.etat}</div>
                    </div>
                `;

                    // Gestion de la sélection
                    card.addEventListener('click', () => {
                        document.querySelectorAll('.materiel-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                        validateButton.disabled = false; // Activer le bouton valider
                        validateButton.dataset.selectedId = materiel.id_materiel; // Stocker l'ID du matériel
                    });

                    materielsList.appendChild(card);
                });
            } else {
                materielsList.innerHTML = '<p>Aucun matériel disponible.</p>';
            }
        } else {
            console.error('Erreur lors de la récupération des matériels disponibles.');
        }
    } catch (error) {
        console.error('Erreur lors du fetch des matériels disponibles:', error);
    }

    // Afficher la popup
    popup.classList.remove('hidden');
});

// Validation de l'ajout d'un matériel
document.getElementById('validate-materiel').addEventListener('click', async () => {
    const validateButton = document.getElementById('validate-materiel');
    const materielId = validateButton.dataset.selectedId;

    if (!materielId) return;

    const idResponsable = localStorage.getItem('id_responsable'); // Récupérer l'ID responsable depuis le localStorage

    try {
        const response = await fetch(`/api/collaborateur/${collaborateurId}/materiels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'id-responsable': idResponsable, // Ajouter l'ID responsable dans les headers
            },
            body: JSON.stringify({ id_materiel: materielId }),
        });

        if (response.ok) {
            console.log('Matériel ajouté avec succès.');
            document.getElementById('materiels-popup').classList.add('hidden'); // Cacher la popup
            await loadMateriels(); // Recharger la liste des matériels
        } else {
            console.error('Erreur lors de l\'ajout du matériel.');
        }
    } catch (error) {
        console.error('Erreur lors de la requête d\'ajout du matériel:', error);
    }
});

// Fermeture de la popup
document.getElementById('close-materiel-popup').addEventListener('click', () => {
    document.getElementById('materiels-popup').classList.add('hidden');
});


    // ===== ÉVÉNEMENTS =====

    // Publier un commentaire
    document.getElementById('ajouter-commentaire-form').addEventListener('submit', (e) => {
        e.preventDefault();
    
        const contenu = document.getElementById('nouveau-commentaire').value.trim();
        if (contenu) {
            publierCommentaire(contenu); // Pas de parentCommentId pour un commentaire principal
            document.getElementById('nouveau-commentaire').value = ''; // Réinitialiser le champ
        } else {
            console.error('Le champ de commentaire est vide.');
        }
    });

   
    const showLikesPopup = async (commentaireId) => {
        const popup = document.getElementById('likes-popup');
        const likesList = document.getElementById('likes-list');

        // Rendre le pop-up visible
        popup.classList.remove('hidden');

        try {
            // Charger la liste des likes via l'API
            const response = await fetch(`/api/commentaires/${commentaireId}/likes`);
            if (response.ok) {
                const services = await response.json();
                // Remplir la liste des likes
                likesList.innerHTML = services.length > 0
                    ? services.map(service => `<p>${service.nom_service}</p>`).join('')
                    : '<p>Aucun like pour ce commentaire.</p>';
            } else {
                likesList.innerHTML = '<p>Erreur lors du chargement des likes.</p>';
                console.error('Erreur API :', response.statusText);
            }
        } catch (error) {
            likesList.innerHTML = '<p>Erreur de chargement.</p>';
            console.error('Erreur lors de la requête des likes :', error);
        }
    };

    // Fonction pour fermer le pop-up
    const closeLikesPopup = () => {
        const popup = document.getElementById('likes-popup');
        popup.classList.add('hidden');
    };

    // Gestion de l'affichage du pop-up au clic sur "like-count"
    document.addEventListener('click', (event) => {
        const likeCount = event.target.closest('.like-count');
        if (likeCount) {
            const commentaireId = likeCount.getAttribute('data-id');
            if (commentaireId) {
                showLikesPopup(commentaireId);
            }
        }
    });

    // Gestion de la fermeture du pop-up
    document.getElementById('close-popup').addEventListener('click', closeLikesPopup);


    document.addEventListener('click', (event) => {
        const button = event.target.closest('.materiels-action-btn');
        if (button) {
            const menu = button.nextElementSibling;
    
            // Cacher tous les autres menus
            document.querySelectorAll('.action-menu.visible').forEach(openMenu => {
                if (openMenu !== menu) {
                    openMenu.classList.remove('visible');
                }
            });
    
            // Basculer la visibilité du menu actuel
            menu.classList.toggle('visible');
    
            // Stopper la propagation pour éviter de déclencher l'autre gestionnaire
            event.stopPropagation();
        }
    });
    
    // Cacher le menu si on clique en dehors
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.card-actions')) {
            document.querySelectorAll('.action-menu.visible').forEach(menu => {
                menu.classList.remove('visible');
            });
        }
    });
    

    // Gérer les actions de la liste
    document.addEventListener('click', async (event) => {
        const actionItem = event.target.closest('.action-item');
        if (actionItem) {
            const action = actionItem.dataset.action; // Vérifier l'action choisie
            console.log('Action cliquée:', action);

            const card = actionItem.closest('.collabo-materiel-card'); // Trouver la carte associée
            if (!card) {
                console.error('Aucune carte associée trouvée.');
                return;
            }

            // Récupérer les IDs à partir des attributs data
            const materielId = card.dataset.idmateriel; // Récupérer l'id_materiel
            const collaborateurId = card.dataset.idcollaborateur; // Récupérer l'id_collaborateur

             // Récupérer les informations supplémentaires du matériel
            const marque = card.querySelector('.materiel-details p strong')?.textContent.trim();
            const modele = card.querySelector('.materiel-details p:first-child')?.textContent.trim();

            // Logs pour déboguer
            console.log('Card associée trouvée:', card);
            console.log('ID matériel récupéré:', materielId);
            console.log('ID collaborateur récupéré:', collaborateurId);
            console.log('Marque:', marque, 'Modèle:', modele);

            if (!materielId || !collaborateurId) {
                console.error('ID matériel ou ID collaborateur manquant.');
                return;
            }

            // Exécuter l'action en fonction de l'option choisie
            try {
                if (action === 'rendu') {
                    showConfirmationPopup(`Le matériel "${marque} ${modele}" a-t-il bien été rendu ?`, async () => {
                        await rendreMateriel(materielId, collaborateurId);
                    });
                } else if (action === 'perdu') {
                    showConfirmationPopup(`Le matériel "${marque} ${modele}" a-t-il bien été perdu ?`, async () => {
                        await signalerMaterielPerdu(materielId, collaborateurId);
                    });
                } else if (action === 'supprimer') {
                    showConfirmationPopup(`Voulez-vous vraiment supprimer le "${marque} ${modele}" ?`, async () => {
                        await supprimerMateriel(materielId, collaborateurId);
                    });
                } else {
                    console.warn('Action non reconnue:', action);
                }
            } catch (error) {
                console.error('Erreur lors de l\'exécution de l\'action:', error);
            }
        }
    });

    // Fonction pour popup confirmation matériel
    const showConfirmationPopup = (message, onConfirm) => {
        const popup = document.getElementById('confirmation-popup');
        const messageElement = document.getElementById('confirmation-message');
        const confirmButton = document.getElementById('confirm-action');
        const cancelButton = document.getElementById('cancel-action');
    
        // Mise à jour du message
        messageElement.textContent = message;
    
        // Attacher un événement de confirmation
        confirmButton.onclick = () => {
            onConfirm();
            popup.classList.add('hidden');
        };
    
        // Cacher la popup au clic sur Annuler
        cancelButton.onclick = () => {
            popup.classList.add('hidden');
        };
    
        // Afficher la popup
        popup.classList.remove('hidden');
    };    
       

    // Fonction pour rendre un matériel
    const rendreMateriel = async (materielId, collaborateurId) => {
        try {
            const idResponsable = localStorage.getItem('id_responsable'); // ID responsable connecté
            if (!idResponsable) {
                console.error('ID responsable manquant.');
                return;
            }
    
            const response = await fetch(`/api/materiels/${materielId}/rendu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_responsable_rendu: idResponsable }),
            });
    
            if (response.ok) {
                console.log('Matériel marqué comme rendu.');
                await loadMateriels(); // Recharger la liste des matériels
            } else {
                console.error('Erreur lors du rendu du matériel.');
            }
        } catch (error) {
            console.error('Erreur lors de la requête de rendu du matériel :', error);
        }
    };    
    
    const signalerMaterielPerdu = async (materielId, collaborateurId) => {
        try {
            const response = await fetch(`/api/materiels/${materielId}/perdu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
    
            if (response.ok) {
                console.log('Matériel marqué comme perdu.');
                await loadMateriels(); // Recharger la liste des matériels
            } else {
                console.error('Erreur lors de la déclaration du matériel perdu.');
            }
        } catch (error) {
            console.error('Erreur lors de la requête de déclaration du matériel perdu :', error);
        }
    };      
    
    const supprimerMateriel = async (materielId, collaborateurId) => {
        try {
            const response = await fetch(`/api/materiels/${materielId}/supprimer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id_collaborateur: collaborateurId }),
            });
    
            if (response.ok) {
                console.log('Matériel supprimé avec succès.');
                await loadMateriels(); // Recharge la liste des matériels
            } else {
                console.error('Erreur lors de la suppression du matériel.');
            }
        } catch (error) {
            console.error('Erreur lors de la requête de suppression du matériel :', error);
        }
    };    


    
    // ===== INITIALISATION =====
    loadCollaborateurData();
    loadMateriels();
    loadCommentaires();
    setupDeletePopup();
});
