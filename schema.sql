-- ============================================================================
-- relay — Setup completo de MySQL para HeidiSQL
-- ============================================================================
-- Pegá todo este archivo en una pestaña Query de HeidiSQL y ejecutá con F9.
-- O usá File → Run SQL file y apuntá a este archivo.
--
-- Este script:
--   1. Crea la base de datos `relay`
--   2. Crea las tablas (users, accounts, links)
--   3. Crea el usuario `relay_app` con permisos mínimos
--   4. Verifica que todo quedó bien
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Crear la base de datos
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `relay`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `relay`;


-- ----------------------------------------------------------------------------
-- 2. Tabla `users` — una fila por identidad registrada
-- ----------------------------------------------------------------------------
-- El `id` es un nanoid de 21 caracteres generado por la app.
-- IMPORTANTE: cada proveedor OAuth genera su propio user record de forma
-- independiente. Dos proveedores con el mismo email NO se fusionan
-- automáticamente — el usuario debe vincularlos explícitamente desde
-- Configuración > Cuentas conectadas.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`            VARCHAR(32)  NOT NULL,
  `email`         VARCHAR(320) NOT NULL,
  `name`          VARCHAR(120) NULL,
  `image`         TEXT         NULL,
  `display_name`  VARCHAR(120) NULL,
  `short_domain`  VARCHAR(255) NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Migration note (existing databases):
--   ALTER TABLE `users` DROP COLUMN `bio`;


-- ----------------------------------------------------------------------------
-- 3. Tabla `accounts` — cuentas OAuth vinculadas a un user
-- ----------------------------------------------------------------------------
-- Un user puede tener múltiples accounts (Google + GitHub para la misma
-- persona, por ejemplo). El par (provider, provider_account_id) es único.
-- Borrar el user borra en cascada sus accounts.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `accounts` (
  `id`                   VARCHAR(32)  NOT NULL,
  `user_id`              VARCHAR(32)  NOT NULL,
  `provider`             VARCHAR(32)  NOT NULL,
  `provider_account_id`  VARCHAR(255) NOT NULL,
  `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_accounts_provider` (`provider`, `provider_account_id`),
  KEY `idx_accounts_user` (`user_id`),
  CONSTRAINT `fk_accounts_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- 4. Tabla `links` — short URLs creados por un user
-- ----------------------------------------------------------------------------
-- El `slug` es único globalmente (es el path público de la URL corta).
-- Borrar el user borra en cascada sus links.
-- Index compuesto en (user_id, created_at) acelera el listado del dashboard.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `links` (
  `id`           VARCHAR(32)  NOT NULL,
  `user_id`      VARCHAR(32)  NOT NULL,
  `slug`         VARCHAR(64)  NOT NULL,
  `destination`  TEXT         NOT NULL,
  `description`  VARCHAR(500) NULL,
  `clicks`       INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_links_slug` (`slug`),
  KEY `idx_links_user_created` (`user_id`, `created_at` DESC),
  CONSTRAINT `fk_links_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- 5. (Opcional) Tabla `clicks` para analytics más detalladas
-- ----------------------------------------------------------------------------
-- Descomentá este bloque si querés guardar referrer/user-agent/país de cada
-- click. La app no la usa hoy pero está pensada para que la conectes después.
-- ----------------------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS `clicks` (
--   `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
--   `link_id`     VARCHAR(32) NOT NULL,
--   `referrer`    VARCHAR(500) NULL,
--   `user_agent`  VARCHAR(500) NULL,
--   `country`     CHAR(2) NULL,
--   `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   KEY `idx_clicks_link` (`link_id`, `created_at` DESC),
--   CONSTRAINT `fk_clicks_link`
--     FOREIGN KEY (`link_id`) REFERENCES `links` (`id`)
--     ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- 6. Crear el usuario `relay_app` con permisos mínimos
-- ----------------------------------------------------------------------------
-- El '%' permite conectar desde cualquier IP. Si vas a restringir por IP
-- específica, reemplazalo por la IP del cliente (ej: 'relay_app'@'76.76.21.21').
-- ----------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'relay_app'@'%'
  IDENTIFIED BY '';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON `relay`.* TO 'relay_app'@'%';

FLUSH PRIVILEGES;


-- ============================================================================
-- VERIFICACIÓN — corré estas queries para confirmar que todo quedó bien
-- ============================================================================

-- Deberías ver 3 tablas: users, accounts, links
SHOW TABLES FROM `relay`;

-- Deberías ver el user 'relay_app' (entre otros)
SELECT `User`, `Host` FROM `mysql`.`user` WHERE `User` = 'relay_app';

-- Deberías ver los grants de SELECT, INSERT, UPDATE, DELETE en relay.*
SHOW GRANTS FOR 'relay_app'@'%';
