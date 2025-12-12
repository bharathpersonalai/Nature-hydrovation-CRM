import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    User as FirebaseUser,
    onAuthStateChanged, 
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

// AuthContext Type Definition
interface AuthContextType {
    user: FirebaseUser | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom Hook to use Auth Context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthContextProvider');
    }
    return context;
};

// AuthContext Provider Component
export const AuthContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const value = {
        user,
        loading,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// SignIn Component
export const SignIn: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [generalError, setGeneralError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError("");
        setPasswordError("");
        setGeneralError("");
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            // Handle specific error cases
            if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
                setGeneralError("Invalid email or password");
            } else if (err.code === "auth/invalid-email") {
                setEmailError("Invalid email format");
            } else if (err.code === "auth/too-many-requests") {
                setGeneralError("Too many failed attempts. Please try again later.");
            } else {
                setGeneralError(err.message || "An error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 relative overflow-hidden">
            
            {/* Animated Background Layers */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-slate-900 to-black animate-gradient-slow bg-[length:400%_400%]" />
                {/* Floating orbs for effect */}
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] border border-white/20">
                    
                    <div className="flex flex-col items-center justify-center mb-8 text-center">
                        <img 
                            src="/SI.png" 
                            alt="Nature Hydrovation Logo" 
                            className="h-16 w-16 object-contain rounded-xl shadow-lg mb-4 bg-white p-1" 
                        />
                        <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
                        <p className="text-slate-300 text-sm mt-1">SmartgenAI Innovation</p>
                    </div>

                    <form onSubmit={handleEmailSignIn} className="space-y-5">
                        <div>
                            <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-1 ml-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                                placeholder="name@gmail.com"
                                disabled={loading}
                            />
                            {emailError && (
                                <div className="text-xs text-red-400 mt-1 ml-1 font-medium">{emailError}</div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs uppercase tracking-wider text-slate-300 font-semibold mb-1 ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-white/10 rounded-xl bg-black/20 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all backdrop-blur-sm"
                                placeholder="••••••••"
                                disabled={loading}
                            />
                            {passwordError && (
                                <div className="text-xs text-red-400 mt-1 ml-1 font-medium">{passwordError}</div>
                            )}
                        </div>

                        {generalError && (
                            <div className="p-3 rounded-lg bg-red-500/20 text-red-200 text-sm border border-red-500/30 text-center">
                                {generalError}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? "Authenticating..." : "Sign In to Dashboard"}
                        </button>
                    </form>
                </div>
            </div>
            
            {/* CSS Animation Styles embedded for this component */}
            <style>{`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-slow {
                    animation: gradient 15s ease infinite;
                }
            `}</style>
        </div>
    );
};