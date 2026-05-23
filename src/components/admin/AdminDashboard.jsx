import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import AdminOverview from './AdminOverview'
import AdminPersonalInfo from './AdminPersonalInfo'
import AdminSkills from './AdminSkills'
import AdminProjects from './AdminProjects'
import AdminEducation from './AdminEducation'
import AdminExperience from './AdminExperience'
import AdminBlog from './AdminBlog'
import AdminCaseStudies from './AdminCaseStudies'
import AdminSocialLinks from './AdminSocialLinks'
import AdminReviews from './AdminReviews'
import AdminUsers from './AdminUsers'
import AdminContactMessages from './AdminContactMessages'
import AdminAds from './AdminAds'
import AdminServices from './AdminServices'
export default function AdminDashboard() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="personal-info" element={<AdminPersonalInfo />} />
        <Route path="skills" element={<AdminSkills />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="education" element={<AdminEducation />} />
        <Route path="experience" element={<AdminExperience />} />
        <Route path="blog" element={<AdminBlog />} />
        <Route path="case-studies" element={<AdminCaseStudies />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="social-links" element={<AdminSocialLinks />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="messages" element={<AdminContactMessages />} />
        <Route path="ads" element={<AdminAds />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  )
}
