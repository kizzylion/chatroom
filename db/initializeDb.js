// pool
const pool = require("./pool");

const initializeDb = async () => {
  try {
    await pool.query(`CREATE DATABASE ${process.env.DB_NAME} IF NOT EXISTS`);
    console.log(`Database ${process.env.DB_NAME} created successfully`);

    // create session table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS session (
            sid VARCHAR PRIMARY KEY,
            sess JSON NOT NULL,
            expire TIMESTAMP(6) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
    `);
    console.log("Session table created successfully");

    // create users table
    await pool.query(`
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(50) NOT NULL UNIQUE,
            firstname VARCHAR(50) NOT NULL,
            lastname VARCHAR(50) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            profile_picture BYTEA,
            role VARCHAR(10) NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("Users table created successfully");

    // create types of groups table
    await pool.query(`
        CREATE TABLE RoomTypes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            is_admin_created BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        )
    `);
    console.log("RoomTypes table created successfully");

    // seed room types
    await pool.query(`
        INSERT INTO RoomTypes (name, description, is_admin_created)
        VALUES ('Official Room', 'Official platform announcements and support.', TRUE);

        INSERT INTO RoomTypes (name, description)
        VALUES ('Public Room', 'Open rooms for shared interests.');

        INSERT INTO RoomTypes (name, description)
        VALUES ('Private Room', 'Rooms with restricted membership for private discussions.');
    `);

    // create rooms table
    await pool.query(`
            CREATE TABLE Rooms (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                room_picture BYTEA,
                room_type_id UUID NOT NULL REFERENCES RoomTypes(id),
                created_by UUID NOT NULL REFERENCES Users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            )
    `);

    console.log("Rooms table created successfully");

    // create room members table
    await pool.query(`
        CREATE TABLE RoomMembers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            room_id UUID NOT NULL REFERENCES Rooms(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
            role VARCHAR(50) NOT NULL DEFAULT 'member',
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(room_id, user_id)
        )
    `);
    console.log("RoomMembers table created successfully");

    // create posts table
    await pool.query(`
        CREATE TABLE Posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            room_id UUID REFERENCES Rooms(id) ON DELETE SET NULL,
            user_id UUID NOT NULL REFERENCES Users(id),
            content TEXT,
            post_picture BYTEA,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("Posts table created successfully");

    // create reaction types table
    await pool.query(`
        CREATE TABLE ReactionTypes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(50) UNIQUE NOT NULL,
            icon TEXT
        )
    `);
    console.log("ReactionTypes table created successfully");

    // create reactions table
    await pool.query(`
        CREATE TABLE Reactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID NOT NULL REFERENCES Posts(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
            reaction_type_id UUID NOT NULL REFERENCES ReactionTypes(id) ON DELETE CASCADE,
            reacted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(post_id, user_id, reaction_type_id)
        )
    `);
    console.log("Reactions table created successfully");

    // create comments table
    await pool.query(`
        CREATE TABLE Comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            post_id UUID NOT NULL REFERENCES Posts(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
            parent_comment_id UUID REFERENCES Comments(id) ON DELETE SET NULL,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("Comments table created successfully");

    // create comment reactions table
    await pool.query(`
        CREATE TABLE CommentReactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            comment_id UUID NOT NULL REFERENCES Comments(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
            reaction_type_id UUID NOT NULL REFERENCES ReactionTypes(id) ON DELETE CASCADE,
            reacted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(comment_id, user_id, reaction_type_id)
        )
    `);
    console.log("CommentReactions table created successfully");

    // create direct messages table
    await pool.query(`
            CREATE TABLE DirectMessages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sender_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                receiver_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(sender_id, receiver_id, sent_at)
            );
    `);
    console.log("DirectMessages table created successfully");

    // create notifications table
    await pool.query(`
        CREATE TABLE Notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
            content TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log("Notifications table created successfully");
  } catch (error) {
    console.error(error);
  }
};
