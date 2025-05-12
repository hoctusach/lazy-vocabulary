
import React from 'react';
import { useUser } from '@/contexts/UserContext';
import { signOut } from '@/services/authService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const UserProfile: React.FC = () => {
  const { user, setUser } = useUser();

  if (!user) return null;

  const handleSignOut = () => {
    signOut();
    setUser(null);
    toast.info('Signed out successfully');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="mr-2 text-sm font-medium hidden sm:block">
        {user.name}
      </div>
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          {user.picture ? (
            <AvatarImage src={user.picture} alt={user.name} />
          ) : null}
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSignOut}
          className="text-xs"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default UserProfile;
