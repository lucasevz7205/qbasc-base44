import React from 'react';
import {NEXO_TASK_MAX_LENGTH,NEXO_TASK_MAX_PARTS} from '@/lib/nexo/cognitive-decision';

export default function NexoTaskField({task,onChange,valid}){
 const hint=React.useId();
 return <div>
  <label className="nexo-control">
   Tarefa de recuperação <small>(opcional)</small>
   <textarea className="qb-input" rows={3} maxLength={NEXO_TASK_MAX_LENGTH} value={task}
    onChange={event=>onChange(event.target.value)} aria-describedby={hint} aria-invalid={!valid}/>
  </label>
  <small id={hint}>{valid?'Escreva o que o aluno precisa recuperar. Use uma ação por linha e escolha o provedor para verificar a fonte.':'Use até '+NEXO_TASK_MAX_PARTS+' ações.'}</small>
 </div>;
}
