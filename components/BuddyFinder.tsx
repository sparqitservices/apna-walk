
import React from 'react';
import { UserProfile } from '../types';
import { SocialHub } from './SocialHub';

interface BuddyFinderProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
}

// Redirecting to unified SocialHub logic to avoid code duplication and blank screens
export const BuddyFinder: React.FC<BuddyFinderProps> = ({ isOpen, onClose, profile }) => {
    return <SocialHub isOpen={isOpen} onClose={onClose} profile={profile} />;
};
