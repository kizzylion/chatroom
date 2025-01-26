const { roomMethods } = require("../db/db_utilities");
const { validationResult } = require("express-validator");

const getSocialRoomsPage = async (req, res) => {
  try {
    const rooms = await roomMethods.getRooms();
    const officialRooms = rooms.filter(
      (room) => room.room_type_name === "Official Room"
    );
    const publicRooms = rooms.filter(
      (room) => room.room_type_name === "Public Room"
    );
    const allRoomMembers = await roomMethods.getAllRoomMembers();

    rooms.forEach((room) => {
      room.members = allRoomMembers.filter(
        (member) => member.room_id === room.id
      );
    });

    console.log(rooms);

    res.render("socialRooms/index", {
      rooms,
      officialRooms,
      publicRooms,
    });
  } catch (err) {
    req.flash(
      "error",
      err.message || "Something went wrong. Please try again."
    );
    return res.redirect("/");
  }
};

const getCreateSocialRoomPage = async (req, res) => {
  const message = res.locals.message;
  const error = res.locals.error;
  try {
    let roomTypes = await roomMethods.getRoomTypes();

    if (res.locals.currentUser.role !== "superadmin") {
      roomTypes = roomTypes.filter(
        (roomType) => roomType.name !== "Official Room"
      );
    }

    res.render("socialRooms/createRoom", {
      roomTypes,
      message,
      error,
    });
  } catch (err) {
    req.flash(
      "error",
      err.message || "Something went wrong. Please try again."
    );
    return res.redirect("/social-rooms/create");
  }
};

const createSocialRoom = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash("error", errors.array()[0].msg);
    return res.redirect("/social-rooms/create");
  }
  const { roomName, roomType, roomPicture, roomDescription } = req.body;

  const userId = res.locals.currentUser.id;
  let base64RoomPicture = null;
  if (roomDescription === "") {
    roomDescription = null;
  }
  if (req.file) {
    base64RoomPicture = req.file.buffer.toString("base64");
  }

  try {
    await roomMethods.insertRoom(
      roomName,
      roomType,
      base64RoomPicture,
      roomDescription,
      userId
    );

    const room = await roomMethods.getRoomByName(roomName);
    console.log(room);
    await roomMethods.insertRoomMember(room.id, userId, "admin");
    req.flash("success", "Room created successfully.");
    res.redirect("/social-rooms");
  } catch (err) {
    req.flash("error", "Something went wrong. Please try again.");
    return res.redirect("/social-rooms/create");
  }
};

const handleRoomAction = async (action, roomId, userId, req, res, next) => {
  try {
    if (action === "join") {
      await roomMethods.insertRoomMember(roomId, userId, "member");
      req.flash("success", "You have joined the room successfully.");
      return res.redirect(`/social-rooms/${roomId}`);
    } else if (action === "leave") {
      await roomMethods.deleteRoomMember(roomId, userId);
      req.flash("success", "You have left the room successfully.");
      return res.redirect(`/social-rooms/${roomId}`);
    }
    return next();
  } catch (err) {
    console.error(`Error during ${action} action for room ${roomId}:`, err);
    req.flash("error", `Failed to ${action} the room. Please try again.`);
    return next(err);
  }
};

const handleMessageDelete = async (req, res, next) => {
  if (!res.locals.currentUser) {
    return res.redirect("/login");
  }
  const roomId = req.params.roomId;
  const messageId = req.params.messageId;
  try {
    await roomMethods.deleteMessage(messageId);
    req.flash("success", "Message deleted successfully.");
    return res.redirect(`/social-rooms/${roomId}`);
  } catch (err) {
    console.error(`Error during delete action for room ${roomId}:`, err);
    req.flash("error", `Failed to delete the message. Please try again.`);
    return next(err);
  }
};

const getSocialRoomPage = async (req, res, next) => {
  const action = req.query.action;
  const roomId = req.params.id;
  const userId = res.locals.currentUser?.id;
  if (!userId) {
    return res.redirect("/login");
  }
  const messageId = req.params.messageId;

  if (action === "join" || action === "leave") {
    await handleRoomAction(action, roomId, userId, req, res, next);
  }

  try {
    let room = await roomMethods.getRoomById(roomId);
    const roomMembers = await roomMethods.getRoomMembers(roomId);
    const posts = await roomMethods.getPostsByRoomId(roomId);
    room.members = roomMembers;
    room.posts = posts;
    const isMember = room.members.some((member) => member.user_id === userId);
    const isAdmin =
      room.members.some(
        (member) => member.user_id === userId && member.role === "admin"
      ) || res.locals.currentUser.role === "superadmin";
    room.isMember = isMember;
    room.isAdmin = isAdmin;
    const roomType = await roomMethods.getRoomTypeById(room.room_type_id);
    room.room_type_name = roomType.name;
    console.log(room.posts);
    res.render("socialRooms/room", { room });
  } catch (err) {
    console.error("Error fetching room data:", err);
    req.flash("error", "Something went wrong. Please try again.");
    return res.redirect("/social-rooms");
  }
};

const getRoomInfo = async (req, res) => {
  const roomId = req.params.id;
  const userId = res.locals.currentUser.id;
  try {
    const room = await roomMethods.getRoomById(roomId);
    const roomMembers = await roomMethods.getRoomMembers(roomId);
    const isMember = roomMembers.some((member) => member.user_id === userId);
    const isAdmin =
      roomMembers.some(
        (member) => member.user_id === userId && member.role === "admin"
      ) || res.locals.currentUser.role === "superadmin";
    room.isMember = isMember;
    room.isAdmin = isAdmin;
    room.members = roomMembers;
    const roomType = await roomMethods.getRoomTypeById(room.room_type_id);
    room.room_type_name = roomType.name;
    console.log("room members", room.members);
    console.log("room is admin", room.isAdmin);
    console.log("room type", room.room_type_name);
    res.render("socialRooms/roomInfo", { room });
  } catch (err) {
    console.error("Error fetching room data:", err);
    req.flash("error", "Something went wrong. Please try again.");
    return res.redirect("/social-rooms");
  }
};

const postMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash("error", errors.array()[0].msg);
    return res.redirect(`/social-rooms/${req.body.roomId}`);
  }

  const { roomId, userId, message, postPicture } = req.body;
  let base64PostPicture = null;
  if (req.file) {
    base64PostPicture = req.file.buffer.toString("base64");
  }
  await roomMethods.insertPost(roomId, userId, message, base64PostPicture);
  req.flash("success", "Message posted successfully.");
  return res.redirect(`/social-rooms/${roomId}`);
};

const removeMember = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const userId = req.params.userId;
    await roomMethods.deleteRoomMember(roomId, userId);
    req.flash("success", "Member removed successfully.");
    return res.redirect(`/social-rooms/${roomId}/info`);
  } catch (err) {
    console.error("Error removing member:", err);
    req.flash("error", "Something went wrong. Please try again.");
    return res.redirect(`/social-rooms/${roomId}/info`);
  }
};

module.exports = {
  getSocialRoomsPage,
  getCreateSocialRoomPage,
  createSocialRoom,
  getSocialRoomPage,
  postMessage,
  handleMessageDelete,
  getRoomInfo,
  removeMember,
};
