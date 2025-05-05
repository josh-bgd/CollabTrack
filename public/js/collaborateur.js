document.addEventListener('DOMContentLoaded', async () => {
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

    let selectedMaterielId = null; // Stocke l'ID du matériel sélectionné

    const boutonRetour = document.getElementById('retour-commentaires'); // Correction de l'ID
    const commentairesSection = document.getElementById('commentaires');
    const materielsSection = document.getElementById('materiels');

    if (boutonRetour) {
        boutonRetour.addEventListener('click', () => {
            if (commentairesSection && materielsSection) {
                boutonRetour.classList.add('hidden');
            }
    
            document.querySelectorAll('.collabo-materiel-card').forEach(card => {
                card.classList.remove('selected-materiel');
            });
    
            document.getElementById('commentaires-header').textContent = "Commentaires généraux";
            selectedMaterielId = null; // Réinitialisation de l'ID matériel sélectionné
            loadCommentaires(); // Recharger les commentaires généraux
        });
    }    

    const loadMateriels = async () => {
        try {
            const response = await fetch(`/api/collaborateur/${collaborateurId}/materiels`);
            const materiels = await response.json();

            const idService = getCookie('id_responsable'); 
            const isRHOrInformatique = idService === '5' || idService === '6';

            const container = document.getElementById('materiels-container');
            if (!container) return;

            container.innerHTML = ''; // Réinitialiser le conteneur

            materiels.forEach((materiel) => {
                const card = document.createElement('div');
                card.classList.add('collabo-materiel-card');
                card.setAttribute('data-idMateriel', materiel.id_materiel);
                card.setAttribute('data-idCollaborateur', collaborateurId);

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
                                    <div class="action-menu">
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
                            ? `<p class="num-serie">N° Série: <br> ${materiel.num_serie}</p>`
                            : `<p class="num-serie">N° Série: <br> Aucun</p>`}
                        </div>
                    </div>
                    <div class="materiel-etat">
                        <small class="etat">${materiel.etat}</small>
                    </div>
                    <button class="voir-commentaires-btn btn btn-primary" data-id="${materiel.id_materiel}">💬 Voir commentaires</button>
                `;

                container.appendChild(card);
            });

            document.querySelectorAll('.voir-commentaires-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    selectedMaterielId = event.target.dataset.id; 

                    const selectedCard = document.querySelector(`.collabo-materiel-card[data-idMateriel="${selectedMaterielId}"]`);
                    if (selectedCard) {
                        const modeleMateriel = selectedCard.querySelector('.materiel-details-first-line p').textContent.trim();
                        document.getElementById('commentaires-header').textContent = `À propos du ${modeleMateriel}`;
                        
                        document.querySelectorAll('.collabo-materiel-card').forEach(card => {
                            card.classList.remove('selected-materiel');
                        });
                        selectedCard.classList.add('selected-materiel');
                    }
            
                    if (commentairesSection && materielsSection) {
                        commentairesSection.classList.remove('hidden');
                        boutonRetour.classList.remove('hidden');
            
                        loadCommentaires(selectedMaterielId); // Charger les commentaires du matériel sélectionné
                    }
                });
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

    // --- Commentaires ---
    /**
     * Charge et affiche les commentaires avec réponses imbriquées.
     */
    /**
 * Charge et affiche les commentaires en fonction du type sélectionné (général ou matériel).
 */
    const loadCommentaires = async (idMateriel = null) => {
        try {
            const idResponsable = getCookie('id_responsable');
            const currentCollabId = getQueryParam('id'); // ID du collaborateur depuis l'URL
            if (!idResponsable || !currentCollabId) {
                console.error('ID du responsable ou collaborateur non trouvé.');
                return;
            }
    
            let url = `/api/collaborateur/${currentCollabId}/commentaires`;
            if (idMateriel !== null) {
                url += `?id_materiel=${idMateriel}`;
            }
            
            const response = await fetch(url);
            const commentaires = await response.json();
    
            // Récupérer les commentaires likés par cet utilisateur
            const likesResponse = await fetch(`/api/responsable/${idResponsable}/likes`);
            const likedComments = await likesResponse.json();
    
            // Ajouter l'info `user_liked` aux commentaires
            commentaires.forEach(comment => {
                comment.user_liked = likedComments.includes(comment.id_commentaire);
            });
    
            // Mettre à jour le DOM
            const container = document.getElementById('commentaires-container');
            container.innerHTML = '';
    
            if (commentaires.length === 0) {
                container.innerHTML = '<p>Aucun commentaire disponible.</p>';
            } else {
                commentaires
                    .filter(comment => !comment.reponse_a) // ✅ Afficher uniquement les commentaires parents
                    .forEach(comment => {
                        const commentCard = generateCommentCard(comment, commentaires);
                        if (commentCard) {
                            container.appendChild(commentCard);
                        }
                    });
            }
    
            // ✅ Affichage du bouton retour si on est sur les commentaires d’un matériel
            const retourBtn = document.getElementById('retour-commentaires');
            retourBtn.style.display = idMateriel ? 'block' : 'none';
    
        } catch (error) {
            console.error('❌ Erreur lors du chargement des commentaires:', error);
        }
    };
    
    // ✅ Ajout gestionnaire de retour aux commentaires généraux
    document.getElementById('retour-commentaires').addEventListener('click', () => {
        loadCommentaires(); // Recharger les commentaires généraux sans idMateriel=null
    });
    
    
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
    
        const idResponsable = getCookie('id_responsable');
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
                    showReplyForm(comment.id_commentaire, repliesContainer, replyBtn.getAttribute('data-service'), comment.id_materiel);
                });
            }
    
            const editBtn = card.querySelector('.edit-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => enableEditMode(card, comment.id_commentaire, comment.contenu, comment.id_materiel));
            }
    
            const deleteBtn = card.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => confirmDeleteComment(comment.id_commentaire, comment.id_materiel));
            }
    
            const likeBtn = card.querySelector('.like-btn');
            if (likeBtn) {
                likeBtn.addEventListener('click', () => toggleLike(comment.id_commentaire));
            }
        }
    
        return card;
    };
    

    // Modification du prenom du collaborateur 
    const modifierNom = document.getElementById("modifier-nom");
    if (!isAdmin){
        modifierNom.classList.add('hidden');
    }

    const profileName = document.getElementById("profile-name");
    const nomPrenomH1 = document.getElementById("collaborateur-nom");
    const modifierNomBtn = document.getElementById("modifier-nom");

    modifierNomBtn.addEventListener("click", () => {
        // ✅ Activer l'édition inline
        nomPrenomH1.contentEditable = "true";
        nomPrenomH1.focus();
        nomPrenomH1.classList.add("editable");
    
        // ✅ Ajouter un bouton valider à côté
        const btnValider = document.createElement("button");
        btnValider.textContent = "✔";
        btnValider.classList.add("btn-valider", "btn-primary");
        btnValider.disabled = true; // Désactivé au début (grisé)

        // ✅ Ajouter un bouton annuler à côté
        const btnAnnuler = document.createElement("button");
        btnAnnuler.textContent = "Annuler";
        btnAnnuler.classList.add("btn-annuler", "btn-grey");
    
        // ✅ Récupérer l'ancien prénom et nom pour comparaison
        const oldFullName = nomPrenomH1.textContent.trim();
    
        // ✅ Créer l'info-bulle type Google (si elle n'existe pas encore)
        let infoBulle = document.getElementById("info-bulle");
        if (!infoBulle) {
            infoBulle = document.createElement("p");
            infoBulle.id = "info-bulle";
            infoBulle.classList.add("info-bulle");
            profileName.appendChild(infoBulle);
        }
        infoBulle.textContent = "Nom Prénom invalide. Exemple : Jean Dupont, Jean-Paul Dense.";
        infoBulle.classList.add("visible");
    
        // Supprimer l'ancien bouton et ajouter les nouveaux
        modifierNomBtn.replaceWith(btnValider);
        btnValider.after(btnAnnuler);
    
        // ✅ Vérification des conditions en temps réel
        const checkValidations = () => {
            let fullName = nomPrenomH1.textContent.trim();
    
            // ✅ Suppression des espaces doubles
            fullName = fullName.replace(/\s+/g, ' ');
    
            // ✅ Mise en majuscule après espace ou tiret
            fullName = fullName.replace(/(^|\s|-)(\S)/g, (match, sep, letter) => sep + letter.toUpperCase());
    
            // ✅ Mise à jour dynamique du texte
            nomPrenomH1.textContent = fullName;
    
            // ✅ Séparation du prénom et du nom
            const words = fullName.split(" ").filter(w => w.length > 0);
            const newPrenom = words[0] || "";
            const newNom = words.slice(1).join(" ") || "";
    
            let valid = true;
    
            // Condition 1 : Prénom et Nom doivent être renseignés
            if (words.length < 2) {
                valid = false;
            }
    
            // Condition 2 : Vérifier si le nom a changé
            if (fullName === oldFullName) {
                valid = false;
            }
    
            // Condition 3 : Vérifier le format (pas d'espaces en début/fin, ni doubles)
            if (/^\s|\s$| {2,}/.test(fullName)) {
                valid = false;
            }
    
            // ✅ Mise à jour de l'affichage
            if (valid) {
                infoBulle.classList.remove("visible"); // Cache l'info-bulle
                btnValider.disabled = false; // Active le bouton
            } else {
                infoBulle.classList.add("visible"); // Affiche l'info-bulle
                btnValider.disabled = true; // Désactive le bouton
            }
        };
    
        // ✅ Ajouter l'événement pour chaque modification
        nomPrenomH1.addEventListener("input", checkValidations);
    
        // ✅ Bouton Valider : Envoi des modifications à l'API
        btnValider.addEventListener("click", async () => {
            const fullName = nomPrenomH1.textContent.trim();
            const words = fullName.split(" ");
            const newPrenom = words[0];
            const newNom = words.slice(1).join(" ");

            const collaborateurId = getQueryParam('id');

            console.log("📤 Envoi de la requête PUT avec :", {
                id: collaborateurId,
                prenom: newPrenom,
                nom: newNom
            });

            try {
                const response = await fetch(`/api/collaborateurs/${collaborateurId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prenom: newPrenom, nom: newNom })
                });

                if (!response.ok) throw new Error("Erreur lors de la modification.");

                nomPrenomH1.contentEditable = "false";
                nomPrenomH1.classList.remove("editable");
                infoBulle.remove(); // 🔹 Supprime la bulle après validation

                // Remettre le crayon à la place des boutons
                btnValider.replaceWith(modifierNomBtn);
                btnAnnuler.remove();
            } catch (error) {
                console.error("❌ Erreur lors de la mise à jour :", error);
            }
        });

        // ✅ Bouton Annuler : Rétablir l'ancien nom et annuler l'édition
        btnAnnuler.addEventListener("click", () => {
            nomPrenomH1.textContent = oldFullName;
            nomPrenomH1.contentEditable = "false";
            nomPrenomH1.classList.remove("editable");
            infoBulle.remove();

            // Remettre le crayon à la place des boutons
            btnValider.replaceWith(modifierNomBtn);
            btnAnnuler.remove();
        });
    
        // ✅ Lancer la vérification au départ
        checkValidations();
    });     
    
    
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
            const idResponsable = getCookie('id_responsable'); // ID responsable
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
                console.log("📥 Réponse API toggle-like:", data);
    
                console.log(`Nouveau nombre de likes pour le commentaire ID: ${commentaireId} = ${data.likes}`);
    
                // ✅ Récupérer le nom du service qui like
                let serviceLiker;
                try {
                    const response = await fetch(`/api/service/${idResponsable}`);
                    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    
                    const serviceData = await response.json();
                    serviceLiker = `@${serviceData.nom}`;
                } catch (error) {
                    console.error("❌ Erreur lors de la récupération du service du liker :", error);
                    serviceLiker = "Un utilisateur";
                }
    
                // ✅ Ne pas envoyer de notification si on like son propre commentaire
                if (data.isOwner) {
                    console.log("❌ Pas de notification envoyée : le propriétaire like son propre commentaire.");
                }
    
                // ✅ Déterminer les notifications à envoyer
                let notifications = [];
    
                // 🔹 Notification au propriétaire du commentaire
                notifications.push({
                    id_responsable: data.service_commentaire,
                    id_commentaire: commentaireId,
                    type_notification: 1,
                    contenu: `${serviceLiker} a liké votre commentaire : "${data.comment_contenu}"`
                });
    
                // ✅ Vérifier s'il y a une mention dans le commentaire
                const mentionedServiceName = data.comment_contenu.match(/@([\w]+)/)?.[1] || null;
                console.log("📢 Service mentionné détecté :", mentionedServiceName);
    
                let mentionedServiceId = null;
                if (mentionedServiceName) {
                    try {
                        const mentionResponse = await fetch(`/api/service/name/${mentionedServiceName}`);
                        if (mentionResponse.ok) {
                            const mentionData = await mentionResponse.json();
                            mentionedServiceId = mentionData.id_service;
                            console.log("🎯 ID du service mentionné récupéré :", mentionedServiceId);
                        }
                    } catch (err) {
                        console.error("❌ Erreur lors de la récupération de l'ID du service mentionné :", err);
                    }
                }
    
                // 🔹 Notification aux participants de la discussion (hors propriétaire)
                if (data.isInDiscussion && Array.isArray(data.discussionParticipants)) {
                    data.discussionParticipants.forEach(idService => {
                        if (idService !== data.service_commentaire) {
                            notifications.push({
                                id_responsable: idService,
                                id_commentaire: commentaireId,
                                type_notification: 2,
                                contenu: `${serviceLiker} a liké un commentaire dans votre discussion : "${data.comment_contenu}"`
                            });
                        }
                    });
                }
    
                // ✅ Envoyer les notifications
                for (const notif of notifications) {
                    await fetch(`/api/notifications/like`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...notif,
                            id_responsable: idResponsable,
                            isLiked: data.isLiked,
                            mentioned_service: mentionedServiceId,  // ✅ Ajout de `mentioned_service`
                        }),
                    });
                }
    
                // ✅ Mise à jour du DOM
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
    
                // ✅ Garder l'animation même si c'est son propre commentaire
                if (data.isLiked) {
                    triggerExplosion(explosion);
                }
            } else {
                console.error('❌ Erreur lors de la requête de like:', response.statusText);
            }
        } catch (error) {
            console.error('❌ Erreur lors de la requête de toggle-like:', error);
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
    const showReplyForm = (parentCommentId, repliesContainer, serviceName, idMaterielParent = null) => {
        // Vérifier s'il existe déjà un formulaire actif
        const existingForm = repliesContainer.querySelector('.reply-form');
        if (existingForm) {
            console.log('Un formulaire de réponse est déjà actif pour ce commentaire.');
            return;
        }
    
        // Créer le formulaire de réponse
        const form = document.createElement('form');
        form.classList.add('reply-form');
        form.innerHTML = `
            <textarea placeholder="Répondre..." required>@${serviceName} </textarea>
            <button type="submit">Envoyer</button>
            <button type="button" class="cancel-reply-btn">Annuler</button>
        `;
    
        // Ajouter le formulaire au conteneur des réponses
        repliesContainer.appendChild(form);
    
        // Gestion de l'annulation
        const cancelBtn = form.querySelector('.cancel-reply-btn');
        cancelBtn.addEventListener('click', () => form.remove());
    
        // Gestion de la soumission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const texte = form.querySelector('textarea').value.trim();
            if (texte) {
                console.log(`ID Matériel du commentaire parent: ${idMaterielParent}, Contenu: ${texte}`);
        
                const mentionedService = texte.match(/@(\w+)/)?.[1] || null; 
                console.log("📢 Service mentionné détecté :", mentionedService);
        
                await publierCommentaire(texte, parentCommentId, idMaterielParent, mentionedService);
        
                setTimeout(() => form.remove(), 200); // ✅ On retire le formulaire sans recharger toute la liste
            }
        });        
    };           
    

// ===== Confirmation de suppression =====
let commentToDeleteId = null;
let commentToDeleteMaterielId = null; //  On s'assure que cette variable est globale et pas locale

const confirmDeleteComment = (commentId, idMateriel = null) => {
    commentToDeleteId = commentId;
    commentToDeleteMaterielId = idMateriel; //  Stocker l'ID matériel correctement
    const popup = document.getElementById('delete-popup');
    popup.classList.remove('hidden'); // Afficher la popup
};

const setupDeletePopup = () => {
    const popup = document.getElementById('delete-popup');
    const confirmButton = document.getElementById('confirm-delete');
    const cancelButton = document.getElementById('cancel-delete');

    confirmButton.addEventListener('click', async () => {
        if (commentToDeleteId) {
            try {
                const response = await fetch(`/api/commentaires/${commentToDeleteId}/supprimer`, { 
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ supprime: true }) 
                });

                if (response.ok) {
                    console.log(`Commentaire ID: ${commentToDeleteId} supprimé avec succès`);

                    //  Recharger les bons commentaires après suppression
                    if (commentToDeleteMaterielId) {
                        console.log(`Rechargement des commentaires du matériel ID: ${commentToDeleteMaterielId}`);
                        loadCommentaires(commentToDeleteMaterielId); //  On recharge les commentaires du matériel
                    } else {
                        console.log("Rechargement des commentaires généraux");
                        loadCommentaires(); //  On recharge les commentaires généraux
                    }
                } else {
                    console.error('Erreur lors de la suppression du commentaire.');
                }
            } catch (error) {
                console.error('Erreur lors de la suppression du commentaire:', error);
            } finally {
                popup.classList.add('hidden'); 
                commentToDeleteId = null; 
                commentToDeleteMaterielId = null; //  Bien reset après suppression
            }
        }
    });

    // Annuler la suppression
    cancelButton.addEventListener('click', () => {
        popup.classList.add('hidden');
        commentToDeleteId = null;
        commentToDeleteMaterielId = null; // ✅ S'assurer qu'on reset bien la variable en cas d'annulation
    });
};


    /**
     * Publie un commentaire ou une réponse.
     */
    const publierCommentaire = async (contenu, parentCommentId = null) => {
        const id_responsable = getCookie('id_responsable');
        if (!id_responsable) {
            console.error('ID responsable manquant.');
            return;
        }
    
        try {
            const response = await fetch(`/api/collaborateur/${collaborateurId}/commentaires`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contenu, 
                    id_responsable, 
                    reponse_a: parentCommentId, 
                    id_materiel: selectedMaterielId ?? null // ✅ Prend l'ID du matériel sélectionné
                }),
            });
    
            if (response.ok) {
                console.log(`✅ Commentaire publié pour ${selectedMaterielId ? `le matériel ID: ${selectedMaterielId}` : "les commentaires généraux"}`);
    
                // ✅ CHARGER LES COMMENTAIRES APPROPRIÉS
                if (selectedMaterielId) {
                    loadCommentaires(selectedMaterielId); // 🔄 Recharge les commentaires liés au matériel
                } else {
                    loadCommentaires(); // 🔄 Recharge les commentaires généraux
                }
    
            } else {
                console.error('❌ Erreur lors de la publication du commentaire.');
            }
        } catch (error) {
            console.error('❌ Erreur lors de la publication du commentaire:', error);
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

    const idResponsable = getCookie('id_responsable'); // Récupérer l'ID responsable depuis le localStorage

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
            publierCommentaire(contenu);
            document.getElementById('nouveau-commentaire').value = '';
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
            const idResponsable = getCookie('id_responsable'); // ID responsable connecté
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


    const commentForm = document.getElementById("ajouter-commentaire-form");

if (commentForm) {
    let mentionDropdown = commentForm.querySelector(".mention-dropdown");
    
    if (!mentionDropdown) {
        mentionDropdown = document.createElement("div");
        mentionDropdown.classList.add("mention-dropdown", "hidden"); 
        commentForm.appendChild(mentionDropdown); 
    }
} else {
    console.error("Impossible d'ajouter `.mention-dropdown` : Formulaire introuvable !");
}

    let serviceList = []; // On initialise à vide
    serviceList = await fetchServices();

    // 🔥 Fonction principale pour afficher les suggestions
    const afficherSuggestions = (inputValue) => {
        const mentionDropdown = document.querySelector(".mention-dropdown"); // ✅ Utiliser l'élément existant

        if (!mentionDropdown) {
            console.error("Impossible de trouver `.mention-dropdown` !");
            return;
        }

        mentionDropdown.innerHTML = ''; // ✅ Reset la liste

        if (!inputValue.includes("@")) {
            mentionDropdown.classList.add("hidden"); // ✅ Cache si pas de "@"
            return;
        }

        const query = inputValue.split("@").pop().toLowerCase(); // ✅ Récupérer le texte après "@"

        // ✅ Filtrer les services en fonction de l'entrée utilisateur
        const filteredServices = serviceList
            .filter(service => service.nom.toLowerCase().includes(query))
            .map(service => service.nom);

        if (filteredServices.length > 0) {
            filteredServices.forEach(service => {
                const option = document.createElement("div");
                option.classList.add("mention-option");
                option.textContent = `@${service}`;
                option.addEventListener("click", () => {
                    const commentInput = document.getElementById("nouveau-commentaire");
                    if (commentInput) {
                        const words = commentInput.value.split(" ");
                        words[words.length - 1] = `@${service}`;
                        commentInput.value = words.join(" ") + " ";
                        mentionDropdown.classList.add("hidden"); // ✅ Cache après sélection
                    }
                });
                mentionDropdown.appendChild(option);
            });

            mentionDropdown.classList.remove("hidden"); // ✅ Afficher les suggestions
        } else {
            mentionDropdown.classList.add("hidden"); // ✅ Cacher s'il n'y a pas de résultats
        }
    };

    // 🔥 Fonction pour initialiser l'autocomplétion
    const setupMentionAutocomplete = () => {
        const commentInput = document.getElementById("nouveau-commentaire");
        const mentionDropdown = document.querySelector(".mention-dropdown"); // ✅ Utiliser l'élément existant

        if (!commentInput || !mentionDropdown) {
            console.error("❌ Impossible d'initialiser l'autocomplétion : éléments introuvables.");
            return;
        }

        // ✅ Gestion de l'entrée utilisateur
        commentInput.addEventListener("input", (e) => {
            afficherSuggestions(e.target.value);
        });

        // ✅ Cacher la liste si on clique en dehors
        document.addEventListener("click", (e) => {
            if (!mentionDropdown.contains(e.target) && e.target !== commentInput) {
                mentionDropdown.classList.add("hidden");
            }
        });
    };

    const parametresPopup = document.getElementById('collaborateur-parametres-popup');
    const parametresOptions = document.getElementById('parametres-options');
    const parametresAction = document.getElementById('parametres-action');
    const supprimerConfirmation = document.getElementById('supprimer-confirmation');
    const deplacerService = document.getElementById('deplacer-service');
    const selectService = document.getElementById('deplacer-collaborateur-service');
    const btnParametres = document.getElementById('parametre-popup-btn');
    const btnRetour = document.getElementById('retour-bouton');

    if (!btnParametres) {
        console.error("❌ Bouton Paramètres introuvable.");
        return;
    }

    if (!isAdmin){
        btnParametres.classList.add('hidden');
    }

    // ✅ Ouvrir la pop-up des paramètres
    btnParametres.addEventListener('click', () => {
        console.log("⚙️ Ouverture de la pop-up des paramètres");
        parametresPopup.classList.remove('hidden');
        afficherParametres();
    });

    // ✅ Fermer la pop-up
    window.fermerPopupParametres = () => {
        console.log("❌ Fermeture de la pop-up des paramètres");
        parametresPopup.classList.add('hidden');
        afficherParametres(); // 🔄 Réinitialise la pop-up
    };

    // ✅ Afficher la liste principale des paramètres
    window.afficherParametres = () => {
        console.log("📌 Affichage des options principales");
        parametresOptions.classList.remove('hidden');
        parametresAction.classList.add('hidden');
        btnRetour.classList.add('hidden');
        supprimerConfirmation.classList.add('hidden');
        deplacerService.classList.add('hidden');
    };

    // ✅ Gérer le clic sur "Supprimer ce collaborateur"
    document.getElementById('supprimer-collaborateur-btn').addEventListener('click', () => {
        console.log("🚨 Demande de suppression du collaborateur");
        parametresOptions.classList.add('hidden');
        parametresAction.classList.remove('hidden');
        btnRetour.classList.remove('hidden');
        supprimerConfirmation.classList.remove('hidden');
    });

    // ✅ Confirmer la suppression du collaborateur
    document.getElementById('confirmer-suppression').addEventListener('click', async () => {
        try {
            const response = await fetch(`/api/collaborateurs/${collaborateurId}/desactiver`, { method: 'PUT' });

            if (!response.ok) throw new Error("Erreur lors de la suppression");
            alert("✅ Collaborateur supprimé !");
            window.location.href = "/accueil?section=collaborateurs"; // Recharge la page sur la section collaborateurs
        } catch (error) {
            console.error("❌ Erreur lors de la suppression :", error);
        }
    });

    // ✅ Gérer le clic sur "Déplacer ce collaborateur"
    document.getElementById('deplacer-collaborateur-btn').addEventListener('click', async () => {
        console.log("📦 Déplacement du collaborateur");
        parametresOptions.classList.add('hidden');
        parametresAction.classList.remove('hidden');
        btnRetour.classList.remove('hidden');
        deplacerService.classList.remove('hidden');

        try {
            const services = await fetchServices();
            selectService.innerHTML = `<option value="" selected disabled>Choisir un service</option>`;
            services.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id_service;
                option.textContent = formatServiceName(service.nom);
                selectService.appendChild(option);
            });
        } catch (error) {
            console.error("❌ Erreur lors du chargement des services :", error);
        }
    });

    // ✅ Confirmer le déplacement du collaborateur
    document.getElementById('confirmer-deplacement').addEventListener('click', async () => {
        const nouveauService = selectService.value;
        if (!nouveauService) {
            alert("Veuillez sélectionner un service !");
            return;
        }

        try {
            const response = await fetch(`/api/collaborateurs/${collaborateurId}/changer-service`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_service: nouveauService })
            });

            if (!response.ok) throw new Error("Erreur lors du déplacement");
            alert("✅ Collaborateur déplacé avec succès !");
            window.location.href = "/accueil?section=collaborateurs"; // Recharge la page sur la section collaborateurs
        } catch (error) {
            console.error("❌ Erreur lors du déplacement :", error);
        }
    });
    
    // ===== INITIALISATION =====
    loadCollaborateurData();
    loadMateriels();
    loadCommentaires();
    setupDeletePopup();
    setupMentionAutocomplete();
});
