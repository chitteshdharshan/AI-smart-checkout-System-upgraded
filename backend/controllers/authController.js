const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Generate JWT Token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("[AUTH ERROR] JWT_SECRET environment variable is missing!");
    throw new Error("JWT_SECRET environment variable is not configured");
  }
  return jwt.sign({ id }, secret, {
    expiresIn: "30d",
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  console.log("[AUTH REGISTER] Request received");
  let stage = "VALIDATION";

  try {
    const { name, email, password, role } = req.body;
    console.log("[AUTH REGISTER] Body:", { name, email: email ? email.toLowerCase().trim() : undefined, role });

    // Step 1: Required Fields Check
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      console.log("[AUTH REGISTER] Validation failed: Missing required fields");
      return res.status(400).json({
        success: false,
        stage: "VALIDATION",
        message: "Name, email and password are required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // Step 2: Email Format Check
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(cleanEmail)) {
      console.log("[AUTH REGISTER] Validation failed: Invalid email format");
      return res.status(400).json({
        success: false,
        stage: "VALIDATION",
        message: "Invalid email format",
      });
    }

    // Step 3: Password Rules Check
    if (password.length < 6) {
      console.log("[AUTH REGISTER] Validation failed: Password too short");
      return res.status(400).json({
        success: false,
        stage: "VALIDATION",
        message: "Password must be at least 6 characters",
      });
    }

    // Step 4: Role Validation
    const allowedRoles = ["user", "admin", "cashier"];
    const userRole = role || "user";
    if (role && !allowedRoles.includes(role)) {
      console.log("[AUTH REGISTER] Validation failed: Invalid role");
      return res.status(400).json({
        success: false,
        stage: "VALIDATION",
        message: "Invalid role specified",
      });
    }

    // Step 5: Duplicate Check
    stage = "CHECK_EXISTING";
    console.log("[AUTH REGISTER] Email:", cleanEmail);
    console.log("[AUTH REGISTER] Checking existing user");
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      console.log("[AUTH REGISTER] Duplicate user found:", cleanEmail);
      return res.status(409).json({
        success: false,
        stage: "CHECK_EXISTING",
        message: "User already exists",
      });
    }

    // Step 6: Create & Save User
    stage = "CREATE_USER";
    console.log("[AUTH REGISTER] Creating user");
    console.log("[AUTH REGISTER] Saving user");
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role: userRole,
    });

    // Step 7: Generate JWT
    stage = "GENERATE_JWT";
    console.log("[AUTH REGISTER] Generating JWT");
    const token = generateToken(user._id);

    console.log("[AUTH REGISTER] Registration successful");
    return res.status(201).json({
      success: true,
      stage: "REGISTER_SUCCESS",
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[AUTH REGISTER ERROR]");
    console.error("stage =", stage);
    console.error("message =", error.message);
    console.error("stack =", error.stack);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        stage: "DB_SAVE",
        message: "User already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        stage: "DB_SAVE",
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      stage,
      message: error.message || "Internal server error during registration",
    });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  console.log("[AUTH LOGIN] Request received");
  try {
    const { email, password } = req.body;
    const cleanEmail = email ? email.toLowerCase().trim() : "";

    if (!cleanEmail || !password) {
      return res.status(400).json({
        success: false,
        stage: "VALIDATION",
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (user && (await user.matchPassword(password))) {
      console.log("[AUTH LOGIN] SUCCESS - User authenticated:", cleanEmail);
      const token = generateToken(user._id);
      return res.json({
        success: true,
        stage: "AUTH_SUCCESS",
        message: "Login successful",
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } else {
      console.warn("[AUTH LOGIN] FAILURE - Invalid credentials for:", cleanEmail);
      return res.status(401).json({
        success: false,
        stage: "AUTH_FAILURE",
        message: "Invalid email or password",
      });
    }
  } catch (error) {
    console.error("[AUTH LOGIN ERROR]:", error);
    return res.status(500).json({
      success: false,
      stage: "UNKNOWN",
      message: error.message || "Internal server error during login",
    });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error("[AUTH PROFILE ERROR]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error fetching profile",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
};
