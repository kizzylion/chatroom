const { Router } = require("express");
const socialRoomsRouter = Router();
const upload = require("../helper/multerUploader");
const { body } = require("express-validator");
const socialRoomsController = require("../controllers/socialRoomsController");

const validateCreateRoom = [
  body("roomName")
    .isLength({ min: 3, max: 15 })
    .withMessage("Room name must be at least 3 characters long."),
  body("roomType").isLength({ min: 1 }).withMessage("Room type is required."),
  body("roomPicture").optional(),
  body("roomDescription").optional(),
];

const validatePostMessage = [
  body("message").isLength({ min: 1 }).withMessage("Message is required."),
  body("postPicture").optional(),
];

socialRoomsRouter.get("/", socialRoomsController.getSocialRoomsPage);
socialRoomsRouter.get("/create", socialRoomsController.getCreateSocialRoomPage);
socialRoomsRouter.post(
  "/create",
  upload.single("roomPicture"),
  validateCreateRoom,
  socialRoomsController.createSocialRoom
);
socialRoomsRouter.get("/:id", socialRoomsController.getSocialRoomPage);

socialRoomsRouter.post(
  "/:id",
  upload.single("postPicture"),
  validatePostMessage,
  socialRoomsController.postMessage
);

// delete message
socialRoomsRouter.get(
  "/:roomId/message/:messageId/delete",
  socialRoomsController.handleMessageDelete
);
// room info
socialRoomsRouter.get("/:id/info", socialRoomsController.getRoomInfo);

// remove member
socialRoomsRouter.get(
  "/:roomId/remove/:userId",
  socialRoomsController.removeMember
);

module.exports = socialRoomsRouter;
