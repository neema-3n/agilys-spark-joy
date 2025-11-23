import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Folder, FileText, File } from 'lucide-react';
import { Compte } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface CompteNode extends Compte {
  children: CompteNode[];
}

interface CompteTreeItemProps {
  node: CompteNode;
  expandAll?: boolean | null;
  onEdit: (compte: Compte) => void;
  onDelete: (compte: Compte) => void;
  onToggleStatus: (compte: Compte) => void;
  getTypeLabel: (type: string) => string;
  getCategorieLabel: (categorie: string) => string;
}

export const CompteTreeItem = ({ 
  node, 
  expandAll,
  onEdit, 
  onDelete,
  onToggleStatus,
  getTypeLabel,
  getCategorieLabel 
}: CompteTreeItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children.length > 0;

  useEffect(() => {
    if (expandAll !== null) {
      setIsExpanded(expandAll);
    }
  }, [expandAll]);

  const getIcon = () => {
    if (hasChildren) {
      return isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md group"
        style={{ paddingLeft: `${(node.niveau - 1) * 24 + 12}px` }}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <div className="w-6" />
        )}
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getIcon()}
          <span className="font-mono text-sm font-medium">{node.numero}</span>
          <span className="text-sm truncate">{node.libelle}</span>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-muted-foreground">{getTypeLabel(node.type)}</span>
          <span className="text-xs text-muted-foreground">{getCategorieLabel(node.categorie)}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            node.statut === 'actif' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
          }`}>
            {node.statut}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(node)}>
                {node.statut === 'actif' ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Désactiver
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Activer
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(node)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <CompteTreeItem
              key={child.id}
              node={child}
              expandAll={expandAll}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
              getTypeLabel={getTypeLabel}
              getCategorieLabel={getCategorieLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};
