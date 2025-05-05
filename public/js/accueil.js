document.addEventListener('DOMContentLoaded', async () => {
    const dynamicContent = document.getElementById('dynamic-content');
    const tabButtons = document.querySelectorAll('.tab'); // Sélection des boutons du menu
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section'); // Récupère la section depuis l'URL
    const idService = getCookie('id_service');
    const isAdmin = getCookie('isAdmin') === 'true';


    console.log("🔄 Section détectée dans l'URL :", section);

    // ===== MAP DES SECTIONS =====
    const contentMap = {
        collaborateurs: { 
            title: 'Liste des Collaborateurs', 
            loader: () => loadCollaborateurs(idService, isAdmin) 
        },
        materiels: { 
            title: 'Liste des Matériels', 
            loader: loadMateriels 
        }
    };

      // Affiche le contenu dynamique d'une section
      const displayDynamicContent = (section) => {
        const content = contentMap[section];
        if (!content) {
            console.error(`Section inconnue : ${section}`);
            return;
        }
    
        // Réinitialiser le contenu et l'état des autres onglets
        dynamicContent.innerHTML = `
            <h2>${content.title}</h2>
            <div id="dynamic-section-content" class="grid-container"></div>
        `;
        dynamicContent.classList.remove('hidden');
        tabButtons.forEach(btn => btn.classList.remove('active')); // Réinitialiser les onglets
        document.querySelector(`.tab[data-section="${section}"]`)?.classList.add('active'); // Activer l'onglet courant
    
        // Appeler uniquement le loader spécifique à la section active
        if (content.loader) {
            console.log(`Chargement de la section : ${section}`);
            content.loader();
        }
    };    

    // ✅ Affichage initial : aucun onglet sélectionné par défaut
    dynamicContent.innerHTML = `
        <h2>Bienvenue</h2>
        <p>Sélectionnez un onglet pour voir son contenu.</p>
    `;
    dynamicContent.classList.remove('hidden');

    // ✅ Si une section est dans l'URL, on l'affiche directement
    if (section && contentMap[section]) {
        displayDynamicContent(section);
        document.querySelector(`.tab[data-section="${section}"]`)?.classList.add('active');
    }

    // ✅ Gestion des clics sur les onglets avec mise à jour de l'URL
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const section = button.dataset.section;
            displayDynamicContent(section);

            // ✅ Met à jour l'URL sans recharger la page
            history.pushState(null, "", `?section=${section}`);
        });
    });
});



// Charger et afficher l'historique
const loadHistorique = () => {
    const sectionContent = document.getElementById('dynamic-section-content');
    if (!sectionContent) {
        console.error("L'élément #dynamic-section-content est introuvable.");
        return;
    }
    sectionContent.innerHTML = '<p>Historique à venir...</p>';
};

const attachCollabClickEvents = () => {
    const collabCards = document.querySelectorAll('.collab-card');
    collabCards.forEach(card => {
        card.addEventListener('click', () => {
            const collaborateurId = card.getAttribute('data-id');
            if (collaborateurId) {
                window.location.href = `/collaborateur?id=${collaborateurId}`;
            }
        });
    });
};

const waitForElementById = async (id, timeout = 500) => {
    let element = document.getElementById(id);
    const start = Date.now();

    while (!element && Date.now() - start < timeout) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Attendre 100ms
        element = document.getElementById(id);
    }

    return element || null;
};

// Fonction pour charger et afficher les collaborateurs
const loadCollaborateurs = async (idService, isAdmin) => {
    try {
        let apiUrl = '/api/collaborateurs';
        if (!isAdmin && idService) {
            apiUrl += `?serviceId=${idService}`;
        }

        console.log("📢 Chargement des collaborateurs avec URL :", apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);

        let collaborateurs = await response.json();
        console.log("👥 Collaborateurs récupérés :", collaborateurs);

        collaborateurs = collaborateurs.filter(collab => collab.activated === 1);

        const sectionContent = await waitForElementById('dynamic-section-content');
        if (!sectionContent) {
            console.warn("⏳ Timeout : L'élément #dynamic-section-content n'a pas été trouvé.");
            return;
        }

        // Structure HTML dynamique
        sectionContent.innerHTML = `
            <div class="flex-container">
                <div class="filter-container">
                    <input 
                        type="text" 
                        id="search-bar" 
                        class="filter-input" 
                        placeholder="Rechercher un collaborateur..."
                    />
                    <div class="filter-options">
                        <label class="gardien-div">
                                <input type="checkbox" id="gardien-filter"> Gardien
                        </label>
                        ${isAdmin ? `<select id="service-filter" class="filter-select">
                            <option value="">Filtrer par service</option>
                        </select>` : ''}
                        <select id="order-filter" class="filter-select">
                            <option value="">Ordre alphabétique</option>
                            <option value="asc">A - Z</option>
                            <option value="desc">Z - A</option>
                        </select>
                    </div>
                </div>
                <div id="collab-list" class="grid-container"></div>
            </div>
        `;

        // ✅ Remplir dynamiquement le service-filter si l'utilisateur est admin
        if (isAdmin) {
            const serviceFilter = document.getElementById('service-filter');
            if (serviceFilter) {
                fetchServices().then(services => {
                    serviceFilter.innerHTML = '<option value="">Filtrer par service</option>';
                    services.forEach(service => {
                        const option = document.createElement('option');
                        option.value = service.id_service;  // ✅ ID du service pour le filtrage
                        option.textContent = formatServiceName(service.nom);  // ✅ Nom du service
                        serviceFilter.appendChild(option);
                    });
                }).catch(error => {
                    console.error("❌ Erreur lors du chargement des services :", error);
                });
            }
        }

        // Injecter les collaborateurs dans la liste
        displayCollaborateurs(collaborateurs);

        // Ajouter les filtres pour les collaborateurs
        setupFilters(collaborateurs, {
            searchInputId: 'search-bar',
            serviceFilterId: isAdmin ? 'service-filter' : null,
            orderFilterId: 'order-filter',
            containerId: 'collab-list',
            displayFunction: displayCollaborateurs,
        });

    } catch (error) {
        console.error('Erreur lors du chargement des collaborateurs :', { error: error.message });
    }
};

// Fonction pour afficher les collaborateurs avec le bouton "Ajouter un collaborateur"
const displayCollaborateurs = (filteredCollaborateurs) => {
    const collabList = document.getElementById('collab-list');
    if (!collabList) return;

    collabList.innerHTML = filteredCollaborateurs.map(collab => `
        <div class="collab-card card" data-id="${collab.id_collaborateur}">
            <div class="materiel-image-container-collab">
                <img src="images/avatar.jpg" alt="Collaborateur" class="icon">
            </div>
            <h3>${collab.prenom} ${collab.nom}</h3>
            <div class="badges-collab centered">
                <p class="badge">${formatServiceName(collab.service)}</p>
                ${collab.gardien === 1 
                    ? `<p class="badge badge-gardien">Gardien</p>` 
                    : ``}
            </div>
            <div class="card-footer"></div>
            <input type="hidden" id="id-service" value="${collab.id_service || ''}">
            <input type="hidden" id="gardien" value="${collab.gardien}">
        </div>
    `).join('');

    // ✅ Ajout du bouton "Ajouter un collaborateur" à la fin de la liste
    collabList.innerHTML += `
        <div class="card card-ajout add-collaborateur-card">
            <button class="add-plus-btn">+</button>
        </div>
    `;

    document.querySelector('.add-collaborateur-card').addEventListener('click', () => {
        const popup = document.getElementById('ajout-collaborateur-popup');
        const selectService = document.getElementById('collaborateur-service');
    
        popup.classList.remove('hidden');
    
        // 🔹 Charger les services seulement si la liste est vide
        if (selectService.children.length <= 1) {
            loadServices();
        }
    });

    // Ajouter les événements de clic pour ouvrir les détails des collaborateurs
    attachCollabClickEvents();
};

const loadServices = async () => {
    try {
        const services = await fetchServices();
        console.log("📋 Services après correction :", services);

        const selectService = document.getElementById('collaborateur-service');
        if (!selectService) return;

        // ✅ Réinitialiser la liste avec l'option par défaut
        selectService.innerHTML = `<option value="" selected disabled>Choisir un service</option>`;

        services.forEach(service => {
            const option = document.createElement('option');

            // ✅ Vérifie si c'est un objet { id_service, nom }
            if (typeof service === "object" && service.id_service && service.nom) {
                option.value = service.id_service;
                option.textContent = formatServiceName(service.nom);
            } else {
                console.warn("⚠️ Service mal formaté :", service);
                return;
            }

            selectService.appendChild(option);
        });

    } catch (error) {
        console.error("❌ Erreur lors du chargement des services :", error);
    }
};

document.getElementById('ajout-collaborateur-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    // ✅ Récupérer les valeurs des champs
    const prenom = document.getElementById('collaborateur-prenom').value.trim();
    const nom = document.getElementById('collaborateur-nom').value.trim();
    const telephone = document.getElementById('collaborateur-telephone').value.trim();
    const id_service = document.getElementById('collaborateur-service').value;
    const gardien = document.getElementById('collaborateur-gardien').value; // Gardien = 0 ou 1

    if (!prenom || !nom || !telephone || !id_service|| !gardien) {
        alert("Veuillez remplir tous les champs obligatoires !");
        return;
    }

    try {
        // ✅ Envoyer la requête à l'API
        const response = await fetch('/api/collaborateurs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prenom, nom, telephone, id_service, gardien })
        });

        if (!response.ok) {
            const errorResponse = await response.text();
            throw new Error(`Erreur HTTP ${response.status} : ${errorResponse}`);
        }

        alert("✅ Collaborateur ajouté avec succès !");
        window.location.href = "/accueil?section=collaborateurs"; // ✅ Recharge sur la section collaborateurs

    } catch (error) {
        console.error("❌ Erreur lors de l'ajout du collaborateur :", error);
    }
});


// Fonction pour charger et afficher les matériels
const loadMateriels = async () => {
    try {
        const response = await fetch('/api/materiels-complets');
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
        const materiels = await response.json();
        console.log("📦 Matériels reçus :", materiels);

        // ✅ Attendre que l'élément soit chargé
        const sectionContent = await waitForElementById('dynamic-section-content');
        if (!sectionContent) {
            console.warn("⏳ Timeout : L'élément #dynamic-section-content n'a pas été trouvé.");
            return;
        }

        sectionContent.innerHTML = `
            <div class="flex-container">
                <div class="filter-container">
                    <input 
                        type="text" 
                        id="search-bar" 
                        class="filter-input" 
                        placeholder="Rechercher un matériel..."
                    />
                    <label>
                        <input type="checkbox" id="filter-libre" />
                        Libre
                    </label>
                    <label>
                        <input type="checkbox" id="filter-attribue" />
                        Attribué
                    </label>
                    <select id="service-filter" class="filter-select-materiels">
                        <option value="">Filtrer par service</option>
                    </select>
                </div>
                <div id="materiel-list" class="grid-container"></div>
            </div>
        `;

        // Charger et injecter les services dans le filtre
        await loadFilters();

        setupFilters(materiels, {
            searchInputId: 'search-bar',
            filterLibreId: 'filter-libre',
            filterAttribueId: 'filter-attribue',
            serviceFilterId: 'service-filter',
            containerId: 'materiel-list',
            displayFunction: displayMateriels,
        });        

    } catch (error) {
        console.error('Erreur lors du chargement des matériels :', { error: error.message });
    }
};

// Fonction pour injecter les services dans le filtre
const loadFilters = async () => {
    try {
        const services = await fetchServices(); // ✅ Récupération
        console.log("📋 Services récupérés pour le filtre :", services); // 🔥 Vérifie ici aussi

        const serviceFilter = document.getElementById('service-filter');
        if (!serviceFilter) {
            console.error("❌ Erreur : #service-filter introuvable.");
            return;
        }

        // ✅ Réinitialiser la liste avec l'option par défaut
        serviceFilter.innerHTML = `<option value="">Filtrer par service</option>`;

        // ✅ Ajouter les services avec la bonne `value`
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id_service;
            option.textContent = formatServiceName(service.nom);
            serviceFilter.appendChild(option);
        });

    } catch (error) {
        console.error("❌ Erreur lors du chargement des services :", error);
    }
};


// Fonction pour afficher les matériels
const displayMateriels = (materiels) => {
    const isAdmin = getCookie('isAdmin') === 'true';
    const materielList = document.getElementById('materiel-list');
    if (!materielList) {
        console.warn("Élément #materiel-list introuvable.");
        return;
    }
    console.log("Données des matériels filtrés :", materiels);

    materielList.innerHTML = materiels.map(mat => `
        <div class="materiel-card card" data-idMateriel="${mat.id_materiel}">
            <!-- Image du matériel -->
            <div class="materiel-image-container">
                <img src="${getImageForType(mat.id_type)}" alt="Matériel" class="materiel-image">
            </div>
            
            <!-- Contenu principal -->
            <div class="materiel-details">
                <div class="first-row">
                    <p class="materiel-title badge" data-fulltext="${mat.marque} ${mat.modele}">${mat.marque} ${mat.modele}</p>
                    ${mat.id_collaborateur
                        ? `<p class="attribue">Attribué</p>` 
                        : mat.perdu
                            ? `<p class="perdu">Perdu</p>` 
                            : `<p class="libre">Libre</p>`}                    
                </div>
                
                ${mat.num_serie
                    ? `<p class="materiel-info data"><span>N° série :</span></br> ${mat.num_serie}</p>`
                    : `<p class="materiel-info data">N° série : </br> aucun</p>`}

                <!-- Inputs cachés -->
                <input type="hidden" class="id-collaborateur" value="${mat.id_collaborateur || ''}">
                <input type="hidden" class="id-service" value="${mat.id_service || ''}">
                <input type="hidden" class="id-type" value="${mat.id_type || ''}">
            </div>

            <!-- Bouton Actions (trois points) -->
            <div class="card-actions">
                <button class="materiels-action-btn">⋮</button>
                <div class="action-menu">
                    ${isAdmin ? `<button class="action-item supprimer-materiel" data-id="${mat.id_materiel}">Supprimer matériel</button>` : ''}
                    ${mat.id_collaborateur 
                        ? `<button class="action-item voir-collaborateur" data-id="${mat.id_collaborateur}">Voir collaborateur</button>` 
                        : ''
                    }
                </div>
            </div>
            <div class="card-footer"></div>
        </div>
    `).join('');

    // 🔹 Ajouter la carte "+" après les matériels
    const addCard = document.createElement('div');
    addCard.classList.add('card', 'add-materiel-card', 'card-ajout');
    addCard.innerHTML = `
        <button class="add-plus-btn">+</button>
    `;

    // Ajouter un event listener pour afficher la popup d'ajout de matériel
    addCard.addEventListener('click', () => {
        document.getElementById('ajout-materiel-popup').classList.remove('hidden');
    });

    // Ajouter la carte à la fin du conteneur
    materielList.appendChild(addCard);

};

const popup = document.getElementById('ajout-materiel-popup');
const closePopup = document.querySelector('.close-popup');
const form = document.getElementById('ajout-materiel-form');

// ➡️ Ferme la pop-up au clic sur la croix
closePopup.addEventListener('click', () => {
    popup.classList.add('hidden');
});

// Charger les types de matériel dès l'ouverture de la pop-up
popup.addEventListener('click', () => {
    const selectType = document.getElementById('materiel-type');

    if (selectType.childElementCount <= 1) { // ✅ Ne recharge pas si la liste est déjà remplie
        loadTypesMateriels();
    }
});

const loadTypesMateriels = async () => {
    try {
        const response = await fetch('/api/types_materiels'); 
        if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);

        const types = await response.json();
        console.log("📋 Types de matériels récupérés :", types);

        const selectType = document.getElementById('materiel-type');
        if (!selectType) return;

        // ✅ Réinitialiser la liste avec l'option par défaut
        selectType.innerHTML = `<option value="" selected disabled>Choisir le type de votre matériel</option>`;

        // ✅ Ajouter les types récupérés
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id_type;  // On garde l'ID pour l'API
            option.textContent = type.nom_type;
            selectType.appendChild(option);
        });

    } catch (error) {
        console.error("❌ Erreur lors du chargement des types de matériels :", error);
    }
};


// ✅ Envoi du formulaire d'ajout
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const modele = document.getElementById('materiel-modele').value.trim();
    const marque = document.getElementById('materiel-marque').value.trim();
    const numSerie = document.getElementById('materiel-num-serie').value.trim();
    const etat = document.getElementById('materiel-etat').value;
    const id_type = parseInt(document.getElementById('materiel-type').value, 10);

    if (!modele || !marque || !etat || !id_type) {
        alert("Veuillez remplir tous les champs obligatoires !");
        return;
    }

    try {
        const response = await fetch('/api/materiels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modele, marque, numSerie, etat, id_type })
        });

        if (!response.ok) {
            const errorResponse = await response.text();
            throw new Error(`Erreur HTTP ${response.status} : ${errorResponse}`);
        }

        console.log("✅ Matériel ajouté avec succès !");
        window.location.href = "?section=materiels";

    } catch (error) {
        console.error("❌ Erreur lors de l'ajout du matériel :", error);
    }
});



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

// Fonction pour configurer les filtres
const setupFilters = (data, config) => {
    const searchInput = document.getElementById(config.searchInputId);
    const filterLibre = config.filterLibreId ? document.getElementById(config.filterLibreId) : null;
    const filterAttribue = config.filterAttribueId ? document.getElementById(config.filterAttribueId) : null;
    const serviceFilter = config.serviceFilterId ? document.getElementById(config.serviceFilterId) : null;
    const orderFilter = config.orderFilterId ? document.getElementById(config.orderFilterId) : null;
    const gardienFilter = document.getElementById("gardien-filter");
    const container = document.getElementById(config.containerId);

    // Vérifier que tous les éléments requis sont présents
    if (!searchInput || !container) {
        console.error("Un ou plusieurs éléments requis pour les filtres sont introuvables.");
        return;
    }

    // Fonction pour appliquer les filtres
    const applyFilters = () => {
        let filteredData = [...data];

        // Filtrer par recherche (si applicable)
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filteredData = filteredData.filter(item => {
                // Logique spécifique à la structure des données (collaborateurs ou matériels)
                if (item.nom && item.prenom) { // Collaborateurs
                    return `${item.prenom} ${item.nom}`.toLowerCase().includes(searchTerm);
                }
                if (item.marque || item.modele) { // Matériels
                    return item.marque?.toLowerCase().includes(searchTerm) ||
                           item.modele?.toLowerCase().includes(searchTerm) ||
                           item.num_serie?.toLowerCase().includes(searchTerm);
                }
                return false;
            });
        }

        // Filtrer par service (si applicable)
        if (serviceFilter && serviceFilter.value) {
            const selectedService = parseInt(serviceFilter.value, 10); // ✅ Convertir en nombre

            filteredData = filteredData.filter(item => {
                const itemServiceId = parseInt(item.id_service, 10); // ✅ Extraire et convertir en nombre

                if (!isNaN(itemServiceId)) { // ✅ Vérifier qu'on a bien un ID valide
                    return itemServiceId === selectedService; // ✅ Comparaison directe ID avec ID
                }
                return false;
            });
        }

        // ✅ Filtrer uniquement les gardiens si la case est cochée
        if (gardienFilter?.checked) {
            filteredData = filteredData.filter(item => item.gardien === 1);
        }

        // Filtrer "Libre" ou "Attribué" (si applicable)
        if (filterAttribue?.checked) {
            filteredData = filteredData.filter(item => item.id_collaborateur); // Matériels non attribués
        }
        if (filterLibre?.checked) {
            filteredData = filteredData.filter(item => !item.id_collaborateur && !item.perdu); // Exclure les perdus
        }        

        // Trier par ordre alphabétique (si applicable)
        if (orderFilter && orderFilter.value) {
            const order = orderFilter.value;
            filteredData.sort((a, b) => {
                if (order === "desc") {
                    return a.nom.localeCompare(b.nom);
                } else if (order === "asc") {
                    return b.nom.localeCompare(a.nom);
                }
                return 0;
            });
        }

        // Réafficher les données filtrées
        config.displayFunction(filteredData);
    };

    // Attacher les gestionnaires d'événements aux filtres
    searchInput.addEventListener('input', applyFilters);
    serviceFilter?.addEventListener('change', applyFilters);
    filterLibre?.addEventListener('change', applyFilters);
    filterAttribue?.addEventListener('change', applyFilters);
    orderFilter?.addEventListener('change', applyFilters);
    gardienFilter?.addEventListener('change', applyFilters);

    // Appliquer les filtres au chargement
    applyFilters();
};

// Fonction pour charger les marques et types
const fetchBrandsAndTypes = async (materiels) => {
    try {
        const [brandsResponse, typesResponse] = await Promise.all([
            fetch('/api/materiels/marques'),
            fetch('/api/types_materiels')
        ]);

        const brands = await brandsResponse.json();
        const types = await typesResponse.json();

        console.log('Données des marques récupérées :', brands);
        console.log('Données des types récupérées :', types);

        // Vérification que `materiels` existe avant d'exécuter forEach
        if (materiels) {
            materiels.forEach(mat => {
                mat.nom_type = types.find(type => type.id_type === mat.id_type)?.nom_type || 'Type inconnu';
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des marques et types :', error);
    }
};
const historiquePopup = document.getElementById('historique-popup');
const historiqueList = document.getElementById('historique-list');
const closePopupBtn = document.getElementById('close-historique-popup');

let menuOpen = false; // Stocke l'état global du menu

// Fermer la popup historique
closePopupBtn.addEventListener('click', () => {
    historiquePopup.classList.add('hidden');
    historiqueList.innerHTML = ''; // Réinitialiser la liste de l'historique
});

// 🎯 Fonction pour gérer les actions des menus matériels
document.addEventListener('click', async (event) => {
    const menuVisible = document.querySelector('.action-menu.visible');
    const materielCard = event.target.closest('.materiel-card');

    console.log("Avant clic", { menuOpen });

    // ✅ Clic sur le bouton du menu ou le menu → Ne rien faire (juste ouvrir le menu)
    if (event.target.closest('.materiels-action-btn') || event.target.closest('.action-menu')) {
        menuOpen = true;
        console.log("Menu ouvert via bouton");
        return;
    }

    // ✅ Si un menu est ouvert et on clique ailleurs, on le ferme
    if (menuOpen && menuVisible) {
        menuVisible.classList.remove('visible');
        menuOpen = false;
        console.log("Menu fermé en cliquant à l'extérieur");
        return;
    }

    // ✅ Si un menu était ouvert mais on clique sur une carte, on ferme le menu mais ne déclenche pas l'historique
    if (materielCard) {
        if (menuOpen) {
            console.log("On ferme le menu et on bloque l'ouverture de l'historique");
            menuOpen = false;
            return;
        }

        // ✅ Affichage de l'historique si aucun menu n'était ouvert
        const materielId = materielCard.dataset.idmateriel;
        if (!materielId) {
            console.error('ID du matériel manquant.');
            return;
        }

        console.log(`📞 Récupération de l'historique pour le matériel ${materielId}`);

        try {
            const response = await fetch(`/api/materiels/${materielId}/historique`);
            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}`);
            }

            const historiqueData = await response.json();
            afficherHistorique(historiqueData, historiqueList);
            historiquePopup.classList.remove('hidden');
            console.log("📜 Historique affiché !");
        } catch (error) {
            console.error("❌ Erreur lors de la récupération de l'historique :", error);
        }
    }
});

document.addEventListener("click", async (event) => {
    const supprimerBtn = event.target.closest(".supprimer-materiel");
    const voirCollabBtn = event.target.closest(".voir-collaborateur");

    // 📌 Récupération des éléments de la pop-up
    const deletePopup = document.getElementById("delete-popup");
    const confirmDeleteBtn = document.getElementById("confirm-delete");
    const cancelDeleteBtn = document.getElementById("cancel-delete");
    let materielIdToDelete = null;

    // ✅ Afficher la pop-up de confirmation au clic sur "Supprimer matériel"
    if (supprimerBtn) {
        event.stopPropagation();
        materielIdToDelete = supprimerBtn.dataset.id;

        if (!materielIdToDelete) {
            console.error("❌ Erreur : ID matériel non trouvé.");
            return;
        }

        deletePopup.classList.remove("hidden"); // 🔥 Afficher la pop-up
    }

    // ❌ Annuler la suppression (fermer la pop-up)
    cancelDeleteBtn?.addEventListener("click", () => {
        deletePopup.classList.add("hidden");
        materielIdToDelete = null;
    });

    // ✅ Confirmer la suppression
    confirmDeleteBtn?.addEventListener("click", async () => {
        if (!materielIdToDelete) return;

        try {
            const response = await fetch(`/api/materiels/${materielIdToDelete}`, { method: "DELETE" });

            if (!response.ok) throw new Error("Erreur lors de la suppression du matériel.");

            // Supprime la carte du DOM
            document.querySelector(`[data-id="${materielIdToDelete}"]`).closest(".materiel-card").remove();
            deletePopup.classList.add("hidden"); // Fermer la pop-up après suppression
            alert("✅ Matériel supprimé avec succès !");
        } catch (error) {
            console.error("❌ Erreur :", error);
            alert("❌ Impossible de supprimer le matériel.");
        }

        materielIdToDelete = null; // Réinitialiser l'ID après action
    });

    // ✅ Redirection vers la page collaborateur
    if (voirCollabBtn) {
        event.stopPropagation();
        const materielCard = voirCollabBtn.closest(".materiel-card");
        const inputHidden = materielCard.querySelector(".id-collaborateur");

        if (inputHidden && inputHidden.value) {
            const collaborateurId = inputHidden.value;
            window.location.href = `/collaborateur?id=${collaborateurId}`;
        } else {
            alert("❌ Collaborateur introuvable pour ce matériel.");
        }
    }
});


/**
 * Injecte les données d'historique dans la liste de la popup.
 * @param {Array} historiqueData - Les données d'historique.
 * @param {HTMLElement} listContainer - L'élément contenant la liste.
 */
const afficherHistorique = (historiqueData, listContainer) => {
    if (historiqueData.length === 0) {
        listContainer.innerHTML = '<p>Aucun historique trouvé pour ce matériel.</p>';
        return;
    }

    // Trie les données par date de remise croissante
    historiqueData.sort((a, b) => new Date(a.date_remise) - new Date(b.date_remise));

    // Injecte chaque élément de l'historique
    historiqueData.forEach((entry) => {
        const listItem = document.createElement('div');
        listItem.classList.add('historique-item'); // Classe pour styliser les items

        listItem.innerHTML = `
            <div class="historique-left">
                <img src="images/avatar.jpg" alt="Collaborateur">
            </div>
            <div class="historique-right">
                <div class="historique-header">
                    <strong>${entry.collaborateur_prenom} ${entry.collaborateur_nom}</strong>
                </div>
                <div class="historique-details">
                    <p>Remis par le service <b> ${entry.service_remise_nom} </b> le <b> ${formatDate(entry.date_remise)} </b></p>
                    ${
                        entry.perdu
                            ? `<p>Déclaré perdu le <b>${formatDate(entry.date_rendu)}</b></p>` // Message pour un matériel perdu
                            : entry.date_rendu
                                ? `<p>Rendu au service <b>${entry.service_rendu_nom}</b> le <b>${formatDate(entry.date_rendu)}</b></p>` // Message pour un matériel rendu
                                : `<p>Matériel encore attribué</p>` // Message par défaut
                    }
                </div>
            </div>
        `;
        listContainer.appendChild(listItem);
    });
};

/**
 * Formate une date au format lisible (exemple : 25 janvier 2025).
 * @param {string} date - La date à formater.
 * @returns {string} - La date formatée.
 */
const formatDate = (date) => {
    if (!date) return 'Date inconnue';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('fr-FR', options);
};

// Initialisation
fetchBrandsAndTypes();
loadMateriels();
