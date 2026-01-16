import * as React from 'react';

interface InviteEmailProps {
  tenantName: string;
  propertyName: string;
  unitName: string;
  loginUrl: string;
  rentAmount: number;
  startDate: string;
}

export const InviteEmail = ({
  tenantName,
  propertyName,
  unitName,
  loginUrl,
  rentAmount,
  startDate,
}: InviteEmailProps) => (
  <div style={{ fontFamily: 'sans-serif', lineHeight: '1.5', color: '#333' }}>
    <h1 style={{ color: '#0f172a' }}>Hei {tenantName},</h1>
    <p>
      Du har blitt invitert til å leie en bolig hos oss.
    </p>
    
    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
      <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#334155' }}>Detaljer om leieforholdet:</h2>
      <ul style={{ paddingLeft: '20px', margin: 0 }}>
        <li><strong>Eiendom:</strong> {propertyName}</li>
        <li><strong>Enhet:</strong> {unitName}</li>
        <li><strong>Månedsleie:</strong> {rentAmount} kr</li>
        <li><strong>Innflytting:</strong> {startDate}</li>
      </ul>
    </div>

    <p>
      For å se kontrakten og signere, vennligst klikk på knappen under:
    </p>

    <a 
      href={loginUrl}
      style={{
        display: 'inline-block',
        background: '#0f172a',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '6px',
        textDecoration: 'none',
        fontWeight: 'bold',
        marginTop: '10px'
      }}
    >
      Se og signer kontrakt
    </a>

    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '30px' }}>
      Hvis du ikke forventet denne invitasjonen, kan du se bort fra denne e-posten.
    </p>
  </div>
);
