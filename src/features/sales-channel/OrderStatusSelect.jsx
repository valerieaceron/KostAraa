import {orderStatusChoices} from './order-view';

export default function OrderStatusSelect({order,disabled,onChange}){
 const choices=orderStatusChoices(order);
 return <select className="sales-order-status-select" aria-label={`Order status for ${order.id}`} value={order.orderStatus} disabled={disabled||!choices.length} onChange={event=>{const choice=choices.find(item=>item.value===event.target.value);if(choice)void onChange(choice)}}>
  <option value={order.orderStatus}>{order.orderStatus}</option>
  {choices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}
 </select>;
}
