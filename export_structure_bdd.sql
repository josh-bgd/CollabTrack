
CREATE TABLE services (
    id_service INT PRIMARY KEY,
    nom VARCHAR(255)
);

CREATE TABLE types_materiels (
    id_type INT PRIMARY KEY,
    nom_type VARCHAR(255)
);

CREATE TABLE collaborateurs (
    id_collaborateur INT PRIMARY KEY,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    telephone VARCHAR(20),
    gardien TINYINT,
    id_service INT,
    activated TINYINT,
    FOREIGN KEY (id_service) REFERENCES services(id_service)
);

CREATE TABLE responsables (
    id_responsable INT PRIMARY KEY,
    identifiant VARCHAR(255),
    mot_de_passe VARCHAR(255),
    id_service INT,
    FOREIGN KEY (id_service) REFERENCES services(id_service)
);

CREATE TABLE materiels (
    id_materiel INT PRIMARY KEY,
    modele VARCHAR(255),
    marque VARCHAR(255),
    num_serie VARCHAR(255),
    etat ENUM('Neuf','Très bon état','Bon état','Moyen état','Mauvais état','Inutilisable'),
    date_remise DATETIME,
    id_collaborateur INT,
    id_responsable INT,
    id_type INT,
    FOREIGN KEY (id_collaborateur) REFERENCES collaborateurs(id_collaborateur),
    FOREIGN KEY (id_responsable) REFERENCES responsables(id_responsable),
    FOREIGN KEY (id_type) REFERENCES types_materiels(id_type)
);

CREATE TABLE historique (
    id_materiel INT,
    id_collaborateur INT,
    date_remise DATETIME,
    date_rendu DATETIME,
    id_responsable_remise INT,
    id_responsable_rendu INT,
    FOREIGN KEY (id_materiel) REFERENCES materiels(id_materiel),
    FOREIGN KEY (id_collaborateur) REFERENCES collaborateurs(id_collaborateur),
    FOREIGN KEY (id_responsable_remise) REFERENCES responsables(id_responsable),
    FOREIGN KEY (id_responsable_rendu) REFERENCES responsables(id_responsable)
);

CREATE TABLE commentaires (
    id_commentaire INT PRIMARY KEY,
    id_collaborateur INT,
    id_responsable INT,
    contenu TEXT,
    date_creation DATETIME,
    date_modification DATETIME,
    reponse_a INT,
    a_lu TINYINT,
    likes INT,
    FOREIGN KEY (id_collaborateur) REFERENCES collaborateurs(id_collaborateur),
    FOREIGN KEY (id_responsable) REFERENCES responsables(id_responsable),
    FOREIGN KEY (reponse_a) REFERENCES commentaires(id_commentaire)
);

CREATE TABLE likes (
    id_like INT PRIMARY KEY,
    id_commentaire INT,
    id_responsable INT,
    FOREIGN KEY (id_commentaire) REFERENCES commentaires(id_commentaire),
    FOREIGN KEY (id_responsable) REFERENCES responsables(id_responsable)
);

CREATE TABLE notifications (
    id_notification INT PRIMARY KEY,
    id_responsable INT,
    id_commentaire INT,
    type_modification VARCHAR(255),
    date_creation DATETIME,
    vu TINYINT,
    FOREIGN KEY (id_responsable) REFERENCES responsables(id_responsable),
    FOREIGN KEY (id_commentaire) REFERENCES commentaires(id_commentaire)
);
