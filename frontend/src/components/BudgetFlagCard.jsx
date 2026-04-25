import React from 'react';

const BudgetFlagCard = ({ message, explanation }) => {
  return (
    <div className="border-l-4 border-error bg-error-container/30 p-md rounded-lg flex items-start gap-md animate-slide-up-fade" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
      <span className="material-symbols-outlined text-error">warning</span>
      <div>
        <p className="font-bold text-error text-body-sm">{message}</p>
        <p className="text-on-surface-variant text-body-sm">{explanation}</p>
      </div>
    </div>
  );
};

export default BudgetFlagCard;
