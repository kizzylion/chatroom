const { roomMethods } = require("../db/db_utilities");
const { validationResult } = require("express-validator");
const getSocialRoomsPage = async (req, res) => {
  try {
    const rooms = await roomMethods.getRooms();
    const officialRooms = rooms.filter(
      (room) => room.room_type_name === "Official Room"
    );
    res.render("socialRooms/index", { rooms, officialRooms });
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

module.exports = {
  getSocialRoomsPage,
  getCreateSocialRoomPage,
  createSocialRoom,
};
