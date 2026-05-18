-- ============================================================================
-- relay — Setup completo de MySQL para HeidiSQL
-- ============================================================================
-- Pegá todo este archivo en una pestaña Query de HeidiSQL y ejecutá con F9.
-- O usá File → Run SQL file y apuntá a este archivo.
--
-- Este script:
--   1. Crea la base de datos `relay`
--   2. Crea las tablas (users, accounts, links)
--   3. Crea/actualiza el usuario `relay_app` y le asigna los permisos mínimos
--   4. Verifica que todo quedó bien
--
-- ANTES DE CORRER:
--   Reemplazá <CAMBIAR_ESTA_PASSWORD> (línea ~135) por una contraseña fuerte.
--   Esa MISMA contraseña va en DATABASE_PASSWORD del .env / Vercel env vars.
--
-- Es idempotente: podés re-correrlo cuantas veces quieras. El bloque del
-- usuario usa CREATE + ALTER para que re-correr siempre deje la contraseña
-- y los grants sincronizados, incluso si el user ya existía.
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

-- Migration para bases existentes creadas con un schema viejo.
-- MySQL no soporta `ADD COLUMN IF NOT EXISTS`, así que las dos columnas
-- nuevas se agregan vía stored procedure que ignora el error si ya existen.
DROP PROCEDURE IF EXISTS `relay_migrate_users`;
DELIMITER //
CREATE PROCEDURE `relay_migrate_users`()
BEGIN
  DECLARE CONTINUE HANDLER FOR 1060 BEGIN END; -- 1060 = Duplicate column name
  DECLARE CONTINUE HANDLER FOR 1091 BEGIN END; -- 1091 = Can't DROP, doesn't exist
  ALTER TABLE `users` ADD COLUMN `display_name` VARCHAR(120) NULL;
  ALTER TABLE `users` ADD COLUMN `short_domain` VARCHAR(255) NULL;
  ALTER TABLE `users` DROP COLUMN `bio`;
END //
DELIMITER ;
CALL `relay_migrate_users`();
DROP PROCEDURE `relay_migrate_users`;


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
-- 6. Crear/actualizar el usuario `relay_app` y sus permisos
-- ----------------------------------------------------------------------------
-- El '%' permite conectar desde cualquier IP. Si vas a restringir por IP
-- específica, reemplazalo por la IP del cliente (ej: 'relay_app'@'76.76.21.21').
--
-- IMPORTANTE: poné la misma contraseña en DATABASE_PASSWORD del .env y en
-- las env vars de Vercel. Si las dos no coinciden, el login se cae con
-- "Access denied" en TODOS los proveedores OAuth (auth.config.ts:46).
--
-- CREATE USER es idempotente vía IF NOT EXISTS, pero NO actualiza la
-- contraseña si el user ya existía. Por eso el ALTER USER después: garantiza
-- que re-correr el script siempre sincronice la contraseña al valor de abajo.
-- ----------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'relay_app'@'%'
  IDENTIFIED BY 'osAlak9mMbHqQgNMbtgkJovsZzPazX1i41QuS78nOHE=';

ALTER USER 'relay_app'@'%'
  IDENTIFIED BY 'osAlak9mMbHqQgNMbtgkJovsZzPazX1i41QuS78nOHE=';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON `relay`.* TO 'relay_app'@'%';

FLUSH PRIVILEGES;


-- ============================================================================
-- VERIFICACIÓN — corré estas queries para confirmar que todo quedó bien
-- ============================================================================

-- 1. Deberían aparecer 3 tablas: accounts, links, users
SHOW TABLES FROM `relay`;

-- 2. La tabla `users` debe tener display_name y short_domain (post-migration)
DESCRIBE `relay`.`users`;

-- 3. El user 'relay_app'@'%' debe existir
SELECT `User`, `Host` FROM `mysql`.`user` WHERE `User` = 'relay_app';

-- 4. Tienen que aparecer 2 líneas — la de USAGE y la de
--    `GRANT SELECT, INSERT, UPDATE, DELETE ON relay.*`. Si sólo ves USAGE,
--    los grants no se aplicaron y el login va a fallar con error 1044.
SHOW GRANTS FOR 'relay_app'@'%';
