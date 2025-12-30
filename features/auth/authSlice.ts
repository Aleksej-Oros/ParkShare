import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/firebase';

interface AuthState {
  user: FirebaseUser | null;
  loading: boolean;
  errorMessage: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  errorMessage: null,
};

export const register = createAsyncThunk(
  'auth/register',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await signOut(auth);
    return null;
  } catch (error: any) {
    return rejectWithValue(error.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<FirebaseUser | null>) => {
      state.user = action.payload;
    },
    clearError: (state) => {
      state.errorMessage = null;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(register.pending, (state) => { state.loading = true; state.errorMessage = null; })
      .addCase(register.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; })
      .addCase(register.rejected, (state, action) => { state.loading = false; state.errorMessage = action.payload as string; })

      .addCase(login.pending, (state) => { state.loading = true; state.errorMessage = null; })
      .addCase(login.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; })
      .addCase(login.rejected, (state, action) => { state.loading = false; state.errorMessage = action.payload as string; })

      .addCase(logout.pending, (state) => { state.loading = true; state.errorMessage = null; })
      .addCase(logout.fulfilled, (state) => { state.loading = false; state.user = null; })
      .addCase(logout.rejected, (state, action) => { state.loading = false; state.errorMessage = action.payload as string; });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;

