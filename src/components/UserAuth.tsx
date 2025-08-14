import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { userService, type User, type Session } from '@/services/api/userService';
import { useToast } from '@/hooks/use-toast';

interface UserAuthProps {
  onUserLogin: (user: User, session: Session) => void;
  currentUser?: User;
  onLogout: () => void;
}

export default function UserAuth({ onUserLogin, currentUser, onLogout }: UserAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const { toast } = useToast();



  const handleLogin = async () => {
    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    const result = await userService.login(email, password);
    setLoading(false);

    if (result.success && result.data) {
      toast({ title: "Welcome back!", description: "Login successful" });
      
      // Create user object (backend only returns session)
      const user: User = { 
        user_id: result.data.user_id, 
        email, 
        nickname: email.split('@')[0] 
      };
      
      // Session persistence is handled by the onUserLogin callback
      
      onUserLogin(user, result.data);
      setEmail('');
      setPassword('');
    } else {
      toast({ 
        title: "Login failed", 
        description: result.error || "Please check your credentials", 
        variant: "destructive" 
      });
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !nickname) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    const result = await userService.register(email, nickname, password);
    setLoading(false);

    if (result.success && result.data) {
      toast({ 
        title: "Account created successfully!", 
        description: "You can now login with your credentials" 
      });
      
      // Switch to login tab and keep email filled
      setActiveTab('login');
      setPassword('');
      setNickname('');
    } else {
      toast({ 
        title: "Registration failed", 
        description: result.error || "Please try again", 
        variant: "destructive" 
      });
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      // Get session from localStorage to logout from backend
      const savedSession = localStorage.getItem('lazy-vocab-session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          await userService.logout(session.session_id);
        } catch (error) {
          console.error('Backend logout error:', error);
        }
      }
    }
    onLogout();
    toast({ title: "Logged out successfully" });
  };

  if (currentUser) {
    return (
      <Button onClick={handleLogout} variant="outline" size="sm">
        Logout
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">Welcome to Lazy Vocabulary</CardTitle>
        <p className="text-sm text-muted-foreground text-center">
          Create an account or login to track your learning progress
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-nickname">Nickname</Label>
              <Input
                id="register-nickname"
                type="text"
                placeholder="Choose a nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>
            <Button onClick={handleRegister} disabled={loading} className="w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}