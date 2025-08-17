import mongoose from "mongoose";

const vinculoSchema = new mongoose.Schema(
  {
    edificio: { type: String, default: "" },

    nivel: { type: [String], default: [] },

    rol: { type: String, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: "" },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    rol: { type: String, enum: ["admin", "empleado"], default: "empleado" },

    vinculos: { type: [vinculoSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: { versionKey: false },
  }
);

export const User = mongoose.model("User", userSchema);
