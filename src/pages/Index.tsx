
import React from 'react';
import VocabularyApp from '@/components/VocabularyApp';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center">Lazy Vocabulary</h1>
        <p className="text-center text-muted-foreground">
          Learn vocabulary effortlessly with push notifications
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="text-sm text-blue-500">Are you new?</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Get started in 3 easy steps:</p>
                <ol className="list-decimal ml-4 mt-1">
                  <li>Click on Upload New File</li>
                  <li>Enable notifications</li>
                  <li>Start learning!</li>
                </ol>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>
      
      <main className="container mx-auto px-4">
        <VocabularyApp />
      </main>
      
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>© 2025 Lazy Vocabulary - Web Edition</p>
      </footer>
    </div>
  );
};

export default Index;
