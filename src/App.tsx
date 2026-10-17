import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './components/guards/RequireAuth';
import { PublicOnlyRoute } from './components/guards/PublicOnlyRoute';
import { Layout } from './components/Layout';
import { PageSkeleton } from './components/common/Skeleton';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { NamePromptModal } from './components/auth/NamePromptModal';
import { InstallBanner } from './components/pwa/InstallBanner';

// Lazy-loaded route components for maximum performance & code splitting
const Home = lazy(() => import('./pages/Home'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const AuthChoice = lazy(() => import('./pages/auth/AuthChoice'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

// Protected user routes
const Profile = lazy(() => import('./pages/Profile'));
const Saved = lazy(() => import('./pages/Saved'));
const CreateNotice = lazy(() => import('./pages/CreateNotice'));
const ManageNotices = lazy(() => import('./pages/ManageNotices'));
const EditNotice = lazy(() => import('./pages/EditNotice'));
const NoticeDetails = lazy(() => import('./pages/NoticeDetails'));

// Legal and fallback routes
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <NamePromptModal />
          <InstallBanner />
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Public Home Feed with Navigation Layout */}
              <Route
                path="/"
                element={
                  <Layout>
                    <Home />
                  </Layout>
                }
              />

              {/* Protected Notice Details View (Requires authentication to open) */}
              <Route
                path="/notice/:id"
                element={
                  <RequireAuth>
                    <NoticeDetails />
                  </RequireAuth>
                }
              />
              <Route
                path="/notices/:id"
                element={
                  <RequireAuth>
                    <NoticeDetails />
                  </RequireAuth>
                }
              />

              {/* Onboarding Carousel */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Public-Only Auth Screens (Redirects verified authenticated users) */}
              <Route
                path="/auth"
                element={
                  <PublicOnlyRoute>
                    <AuthChoice />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <Signup />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicOnlyRoute>
                    <ForgotPassword />
                  </PublicOnlyRoute>
                }
              />

              {/* Email Verification Pending Screen */}
              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* Auth Callback Route (PKCE Exchange & Recovery routing) */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Reset Password Completion Screen (Recovery Session Guarded) */}
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes (Wrapped in RequireAuth & Layout) */}
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Layout>
                      <Profile />
                    </Layout>
                  </RequireAuth>
                }
              />
              <Route
                path="/saved"
                element={
                  <RequireAuth>
                    <Layout>
                      <Saved />
                    </Layout>
                  </RequireAuth>
                }
              />
              <Route
                path="/notices/new"
                element={
                  <RequireAuth>
                    <Layout>
                      <CreateNotice />
                    </Layout>
                  </RequireAuth>
                }
              />
              <Route
                path="/notices/manage"
                element={
                  <RequireAuth>
                    <Layout>
                      <ManageNotices />
                    </Layout>
                  </RequireAuth>
                }
              />
              <Route
                path="/notices/:id/edit"
                element={
                  <RequireAuth>
                    <Layout>
                      <EditNotice />
                    </Layout>
                  </RequireAuth>
                }
              />

              {/* Legal Documents */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
